"use client";

// F-01 방 만들기: 질문 4개를 한 단계씩 넘기는 단계형 폼 (v0.1 빠른 시작 폼 패턴 재사용)
// "다음"은 현재 단계(fieldset)만 검사하고, Enter 키도 "다음"으로 동작한다.

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import StepProgress from "@/components/StepProgress";
import { choice, fieldLabel, ghostButton, input, muted, primaryButton, secondaryButton } from "@/components/styles";
import { addDays, todayISO } from "@/lib/date";
import { createTrip, errorMessage, type NewTrip } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { useValidation } from "@/lib/validation";
import { LABELS, type Region } from "@/types/trip";

const STEPS = ["어떤 여행이에요?", "언제쯤 갈까요?", "어디로 갈까요?", "언제까지 응답받을까요?"];
const MAX_CANDIDATES = 5;
const MAX_WINDOW_DAYS = 90;

export default function CreateTripForm({ defaultHostName }: { defaultHostName: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const v = useValidation("create");
  const today = todayISO();
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<NewTrip>({
    name: "",
    hostName: defaultHostName,
    region: "domestic",
    windowStart: "",
    windowEnd: "",
    destinationFixed: false,
    destination: "",
    candidates: [""],
    deadline: "",
  });
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);

  // 단계가 바뀌면 첫 입력 칸으로 포커스
  useEffect(() => {
    fieldsetRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }, [step]);

  const set = <K extends keyof NewTrip>(key: K, value: NewTrip[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const setCandidate = (i: number, value: string) =>
    set("candidates", form.candidates.map((c, j) => (j === i ? value : c)));

  const isLast = step === STEPS.length - 1;
  // 응답 마감일 기본값: 3일 뒤 (후보 시기 시작일을 넘지 않게)
  const deadlineMax = form.windowStart || undefined;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const candidates = form.candidates.map((c) => c.trim()).filter(Boolean);
    const dup = new Set(candidates).size !== candidates.length;
    if (!v.validate(fieldsetRef.current, step === 2 && !form.destinationFixed && dup ? { candidate0: "같은 후보가 두 번 들어 있어요." } : {})) return;

    if (!isLast) {
      if (step === 2 && !form.deadline && form.windowStart) {
        const suggested = addDays(today, 3);
        set("deadline", suggested < form.windowStart ? suggested : form.windowStart);
      }
      setStep(step + 1);
      return;
    }

    setPending(true);
    try {
      const code = await createTrip(supabase, {
        ...form,
        name: form.name.trim(),
        hostName: form.hostName.trim(),
        destination: form.destination.trim(),
        candidates: form.destinationFixed ? [] : candidates,
      });
      router.push(`/t/${code}?created=1`);
    } catch (err) {
      v.setError("deadline", errorMessage(err));
      setPending(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className="space-y-8">
      <StepProgress step={step} total={STEPS.length} />

      <fieldset key={step} ref={fieldsetRef} className="space-y-5">
        <legend className="mb-5 text-2xl font-bold tracking-tight">{STEPS[step]}</legend>

        {step === 0 && (
          <>
            <div className="space-y-1">
              <label className="block space-y-1">
                <span className={fieldLabel}>여행 이름</span>
                <input {...v.field("name")} className={input} required maxLength={30} placeholder="예: 겨울방학 부산 여행" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </label>
              <FieldError id={v.errorId("name")} message={v.errors.name} />
            </div>
            <div className="space-y-1">
              <label className="block space-y-1">
                <span className={fieldLabel}>방장 이름 (이 방에서 쓸 내 이름)</span>
                <input {...v.field("hostName")} className={input} required maxLength={10} value={form.hostName} onChange={(e) => set("hostName", e.target.value)} />
              </label>
              <FieldError id={v.errorId("hostName")} message={v.errors.hostName} />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className={muted}>정확한 날짜는 친구들의 응답을 보고 정해요. 가능한 넓은 범위를 골라 주세요 (최대 90일).</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block space-y-1">
                  <span className={fieldLabel}>후보 시기 시작</span>
                  <input {...v.field("windowStart")} type="date" className={input} required min={today} value={form.windowStart} onChange={(e) => set("windowStart", e.target.value)} />
                </label>
                <FieldError id={v.errorId("windowStart")} message={v.errors.windowStart} />
              </div>
              <div className="space-y-1">
                <label className="block space-y-1">
                  <span className={fieldLabel}>후보 시기 끝</span>
                  <input
                    {...v.field("windowEnd")}
                    type="date"
                    className={input}
                    required
                    min={form.windowStart || today}
                    max={form.windowStart ? addDays(form.windowStart, MAX_WINDOW_DAYS) : undefined}
                    value={form.windowEnd}
                    onChange={(e) => set("windowEnd", e.target.value)}
                  />
                </label>
                <FieldError id={v.errorId("windowEnd")} message={v.errors.windowEnd} />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <fieldset className="space-y-2">
              <legend className={`mb-2 ${fieldLabel}`}>국내/해외</legend>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(LABELS.region) as Region[]).map((r) => (
                  <label key={r} className={choice}>
                    <input type="radio" name="region" required checked={form.region === r} onChange={() => set("region", r)} />
                    {LABELS.region[r]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className={`mb-2 ${fieldLabel}`}>여행지는 정했어요?</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  [true, "정했어요"],
                  [false, "아직이에요"],
                ].map(([value, label]) => (
                  <label key={String(value)} className={choice}>
                    <input type="radio" name="destinationFixed" required checked={form.destinationFixed === value} onChange={() => set("destinationFixed", value as boolean)} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {form.destinationFixed ? (
              <div className="space-y-1">
                <label className="block space-y-1">
                  <span className={fieldLabel}>여행지</span>
                  <input {...v.field("destination")} className={input} required maxLength={30} placeholder="예: 부산" value={form.destination} onChange={(e) => set("destination", e.target.value)} />
                </label>
                <FieldError id={v.errorId("destination")} message={v.errors.destination} />
              </div>
            ) : (
              <div className="space-y-2">
                <p className={muted}>투표에 올릴 후보를 적어 주세요 (선택, 최대 5개). 친구들도 응답하면서 제안할 수 있어요.</p>
                {form.candidates.map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-end gap-2">
                      <label className="block min-w-0 flex-1 space-y-1">
                        <span className={fieldLabel}>후보 {i + 1}</span>
                        <input {...v.field(`candidate${i}`)} className={input} maxLength={30} placeholder={i === 0 ? "예: 강릉" : ""} value={c} onChange={(e) => setCandidate(i, e.target.value)} />
                      </label>
                      {form.candidates.length > 1 && (
                        <button type="button" className={ghostButton} aria-label={`후보 ${i + 1} 지우기`} onClick={() => set("candidates", form.candidates.filter((_, j) => j !== i))}>
                          지우기
                        </button>
                      )}
                    </div>
                    <FieldError id={v.errorId(`candidate${i}`)} message={v.errors[`candidate${i}`]} />
                  </div>
                ))}
                {form.candidates.length < MAX_CANDIDATES && (
                  <button type="button" className={ghostButton} onClick={() => set("candidates", [...form.candidates, ""])}>
                    + 후보 추가
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <div className="space-y-1">
            <label className="block space-y-1">
              <span className={fieldLabel}>응답 마감일</span>
              <input {...v.field("deadline")} type="date" className={input} required min={today} max={deadlineMax} value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
            </label>
            <FieldError id={v.errorId("deadline")} message={v.errors.deadline} />
            <p className={muted}>후보 시기가 시작되기 전까지 정해야 해요. 마감 전이라도 방장은 언제든 확정할 수 있어요.</p>
          </div>
        )}
      </fieldset>

      <div className="flex gap-3">
        <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} className={secondaryButton}>
          이전
        </button>
        <button type="submit" disabled={pending} className={`flex-1 ${primaryButton} py-3 text-base`}>
          {isLast ? (pending ? "만드는 중…" : "방 만들기") : "다음"}
        </button>
      </div>
    </form>
  );
}
