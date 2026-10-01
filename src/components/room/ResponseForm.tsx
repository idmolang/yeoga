"use client";

// F-05 조율 응답 (단계형): 가능한 날짜 → 1인 예산 → 스타일 → 여행지 투표·제안(미정일 때) → 출발 시간대
// 이름은 참여할 때 이미 받았으므로 FRD 7장의 1단계(이름)는 건너뛴다. 마감 전까지 다시 열어 고칠 수 있다.

import { useEffect, useRef, useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import DateCalendar from "@/components/room/DateCalendar";
import { useRoomContext } from "@/components/room/RoomContext";
import StepProgress from "@/components/StepProgress";
import { card, choice, fieldLabel, ghostButton, h2, input, muted, primaryButton, secondaryButton, subtleBox } from "@/components/styles";
import { dateRange, formatKDate, weekday } from "@/lib/date";
import { saveResponse } from "@/lib/db";
import { responsesOpen } from "@/lib/stage";
import { useValidation } from "@/lib/validation";
import type { DepartSlot } from "@/types/db";
import { LABELS, type Style } from "@/types/trip";

export const DEPART_LABEL: Record<DepartSlot, string> = {
  morning: "오전 (12시 전)",
  afternoon: "오후 (12~18시)",
  evening: "저녁 (18시 이후)",
  any: "상관없음",
};

type StepId = "dates" | "budget" | "styles" | "places" | "depart";
const STEP_TITLE: Record<StepId, string> = {
  dates: "언제 갈 수 있어요?",
  budget: "1인 예산은 얼마까지 괜찮아요?",
  styles: "어떤 여행이 좋아요?",
  places: "어디가 좋아요?",
  depart: "출발은 언제가 편해요?",
};

export default function ResponseForm({ onDone }: { onDone: () => void }) {
  const { data, me, supabase, run } = useRoomContext();
  const { trip, options, votes } = data;
  const mine = data.responses.find((r) => r.user_id === me);
  const open = responsesOpen(trip);
  const [editing, setEditing] = useState(!mine);

  if (!open || (mine && !editing)) {
    return <ResponseSummary open={open} onEdit={() => setEditing(true)} />;
  }
  return (
    <ResponseSteps
      key={mine?.updated_at ?? "new"}
      initial={{
        dates: new Set(mine?.available_dates ?? []),
        budget: mine?.budget ?? 300000,
        styles: mine?.styles ?? [],
        voteIds: votes.filter((v) => v.user_id === me).map((v) => v.option_id),
        depart: mine?.depart_slot ?? "any",
      }}
      onSubmit={async (values) => {
        const ok = await run(() =>
          saveResponse(supabase, data, me, {
            availableDates: [...values.dates],
            budget: values.budget,
            styles: values.styles,
            departSlot: values.depart,
            voteIds: values.voteIds,
            proposals: values.proposals,
          }),
        );
        if (ok) {
          setEditing(false);
          onDone();
        }
      }}
      showPlaces={!trip.destination_fixed}
      options={options}
      windowDates={dateRange(trip.window_start, trip.window_end)}
    />
  );
}

interface Values {
  dates: Set<string>;
  budget: number;
  styles: Style[];
  voteIds: string[];
  depart: DepartSlot;
}

function ResponseSteps({
  initial,
  onSubmit,
  showPlaces,
  options,
  windowDates,
}: {
  initial: Values;
  onSubmit: (v: Values & { proposals: string[] }) => Promise<void>;
  showPlaces: boolean;
  options: { id: string; name: string }[];
  windowDates: string[];
}) {
  const v = useValidation("response");
  const steps: StepId[] = ["dates", "budget", "styles", ...(showPlaces ? (["places"] as StepId[]) : []), "depart"];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(initial);
  const [proposals, setProposals] = useState<string[]>([]);
  const [proposal, setProposal] = useState("");
  const [pending, setPending] = useState(false);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  useEffect(() => {
    fieldsetRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }, [step]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((p) => ({ ...p, [key]: value }));
  const toggleDate = (date: string) => {
    const next = new Set(values.dates);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    set("dates", next);
    v.setError("dates", undefined);
  };
  const toggleStyle = (s: Style) => {
    set("styles", values.styles.includes(s) ? values.styles.filter((x) => x !== s) : [...values.styles, s]);
    v.setError("styles", undefined);
  };
  const toggleVote = (id: string) =>
    set("voteIds", values.voteIds.includes(id) ? values.voteIds.filter((x) => x !== id) : [...values.voteIds, id]);

  const addProposal = () => {
    const name = proposal.trim();
    if (!name) return v.setError("proposal", "제안할 여행지를 입력해 주세요.");
    const existing = options.find((o) => o.name === name);
    if (existing) {
      if (!values.voteIds.includes(existing.id)) toggleVote(existing.id);
      setProposal("");
      return v.setError("proposal", `"${name}"은(는) 이미 후보에 있어서 투표에 체크했어요.`);
    }
    if (proposals.includes(name)) return v.setError("proposal", "이미 제안한 여행지예요.");
    setProposals([...proposals, name]);
    setProposal("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // 체크박스 묶음 "1개 이상"은 HTML 속성으로 못 하므로 스크립트로 검사
    const extra =
      current === "dates" && values.dates.size === 0
        ? { dates: "가능한 날짜를 하루 이상 골라 주세요." }
        : current === "styles" && values.styles.length === 0
          ? { styles: "여행 스타일을 하나 이상 골라 주세요." }
          : {};
    if (!v.validate(fieldsetRef.current, extra)) return;
    if (!isLast) return setStep(step + 1);
    setPending(true);
    await onSubmit({ ...values, proposals });
    setPending(false);
  };

  const weekends = windowDates.filter((d) => [0, 5, 6].includes(weekday(d)));

  return (
    <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className={`${card} space-y-6`}>
      <StepProgress step={step} total={steps.length} />
      <fieldset key={current} ref={fieldsetRef} className="space-y-4">
        <legend className="mb-4 text-xl font-bold">{STEP_TITLE[current]}</legend>

        {current === "dates" && (
          <>
            <p className={muted}>가능한 날짜를 모두 눌러 주세요. {values.dates.size}일 선택됨</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => set("dates", new Set(windowDates))}>전체 선택</button>
              <button type="button" className={secondaryButton} onClick={() => set("dates", new Set([...values.dates, ...weekends]))}>금·토·일 추가</button>
              <button type="button" className={ghostButton} onClick={() => set("dates", new Set())}>모두 해제</button>
            </div>
            <DateCalendar mode="select" name="dates" dates={windowDates} selected={values.dates} onToggle={toggleDate} describedBy={v.errorId("dates")} />
            <FieldError id={v.errorId("dates")} message={v.errors.dates} />
          </>
        )}

        {current === "budget" && (
          <div className="space-y-4">
            <input
              type="range"
              className="w-full accent-sky-600"
              min={50000}
              max={5000000}
              step={10000}
              value={values.budget}
              onChange={(e) => set("budget", Number(e.target.value))}
              aria-label="희망 1인 예산 슬라이더"
            />
            <div className="space-y-1">
              <label className="block space-y-1">
                <span className={fieldLabel}>희망 1인 예산 (원, 교통·숙소·식비 포함)</span>
                <input
                  {...v.field("budget")}
                  type="number"
                  inputMode="numeric"
                  className={input}
                  required
                  min={50000}
                  max={5000000}
                  step={10000}
                  value={values.budget || ""}
                  onChange={(e) => set("budget", Number(e.target.value))}
                />
              </label>
              <FieldError id={v.errorId("budget")} message={v.errors.budget} />
            </div>
            <p className={muted}>약 {Math.round(values.budget / 10000).toLocaleString("ko-KR")}만 원. 다른 사람에게는 최소·최대·중간값으로만 모아서 보여줘요.</p>
          </div>
        )}

        {current === "styles" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LABELS.style) as Style[]).map((s) => (
                <label key={s} className={choice}>
                  <input type="checkbox" name="styles" checked={values.styles.includes(s)} onChange={() => toggleStyle(s)} aria-describedby={v.errorId("styles")} />
                  {LABELS.style[s]}
                </label>
              ))}
            </div>
            <FieldError id={v.errorId("styles")} message={v.errors.styles} />
          </>
        )}

        {current === "places" && (
          <>
            <p className={muted}>가고 싶은 곳에 모두 투표하세요 (선택). 없으면 직접 제안할 수 있어요.</p>
            {options.length + proposals.length === 0 && <p className={subtleBox}>아직 후보가 없어요. 첫 후보를 제안해 주세요!</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((o) => (
                <label key={o.id} className={choice}>
                  <input type="checkbox" name="votes" checked={values.voteIds.includes(o.id)} onChange={() => toggleVote(o.id)} />
                  {o.name}
                </label>
              ))}
              {proposals.map((name) => (
                <label key={name} className={choice}>
                  <input type="checkbox" name="proposals" checked onChange={() => setProposals(proposals.filter((p) => p !== name))} />
                  {name} <span className="text-xs text-sky-700 dark:text-sky-300">내 제안</span>
                </label>
              ))}
            </div>
            <div className="space-y-1">
              <div className="flex items-end gap-2">
                <label className="block min-w-0 flex-1 space-y-1">
                  <span className={fieldLabel}>여행지 제안</span>
                  <input
                    {...v.field("proposal")}
                    className={input}
                    maxLength={30}
                    placeholder="예: 여수"
                    value={proposal}
                    onChange={(e) => setProposal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault(); // Enter 는 "다음"이 아니라 제안 추가
                        addProposal();
                      }
                    }}
                  />
                </label>
                <button type="button" className={secondaryButton} onClick={addProposal}>추가</button>
              </div>
              <FieldError id={v.errorId("proposal")} message={v.errors.proposal} />
            </div>
          </>
        )}

        {current === "depart" && (
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(DEPART_LABEL) as DepartSlot[]).map((s) => (
              <label key={s} className={choice}>
                <input type="radio" name="depart" required checked={values.depart === s} onChange={() => set("depart", s)} />
                {DEPART_LABEL[s]}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex gap-3">
        <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} className={secondaryButton}>이전</button>
        <button type="submit" disabled={pending} className={`flex-1 ${primaryButton} py-3 text-base`}>
          {isLast ? (pending ? "저장하는 중…" : "응답 저장") : "다음"}
        </button>
      </div>
    </form>
  );
}

/** 내 응답 요약 (마감 후, 또는 저장 후) */
function ResponseSummary({ open, onEdit }: { open: boolean; onEdit: () => void }) {
  const { data, me } = useRoomContext();
  const mine = data.responses.find((r) => r.user_id === me);
  const myVotes = data.votes.filter((v) => v.user_id === me).map((v) => data.options.find((o) => o.id === v.option_id)?.name).filter(Boolean);

  return (
    <section className={card} aria-labelledby="my-response">
      <h2 id="my-response" className={h2}>내 응답</h2>
      {!open && <p className={subtleBox}>{data.trip.status === "collecting" ? "응답 마감일이 지나서" : "방장이 응답을 마감해서"} 더 이상 고칠 수 없어요.</p>}
      {mine ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className={muted}>가능한 날짜</dt><dd>{mine.available_dates.length}일 · {mine.available_dates.slice(0, 3).map(formatKDate).join(", ")}{mine.available_dates.length > 3 ? " …" : ""}</dd></div>
          <div><dt className={muted}>희망 1인 예산</dt><dd>{mine.budget.toLocaleString("ko-KR")}원</dd></div>
          <div><dt className={muted}>스타일</dt><dd>{mine.styles.map((s) => LABELS.style[s]).join(", ")}</dd></div>
          <div><dt className={muted}>출발 시간대</dt><dd>{DEPART_LABEL[mine.depart_slot]}</dd></div>
          {!data.trip.destination_fixed && <div><dt className={muted}>투표한 여행지</dt><dd>{myVotes.join(", ") || "없음"}</dd></div>}
        </dl>
      ) : (
        <p className={muted}>응답하지 않았어요.</p>
      )}
      {open && (
        <button type="button" className={secondaryButton} onClick={onEdit}>
          {mine ? "응답 고치기" : "응답하기"}
        </button>
      )}
    </section>
  );
}
