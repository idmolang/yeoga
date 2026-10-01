"use client";

// F-01 빠른 시작: 질문 5개를 한 단계씩 넘기며 응답받는 단계형 폼
// 현재 단계의 필드만 화면에 있으므로, submit 때 브라우저가 그 단계만 검사한다.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { addDays, todayISO } from "@/lib/date";
import { createTrip } from "@/lib/generate";
import ClientOnly from "@/components/ClientOnly";
import { choice, input } from "@/components/styles";
import { clearDraft, loadDraft, saveDraft, upsertTrip } from "@/lib/storage";
import { LABELS, type Companion, type QuickStartAnswers, type Region, type Style } from "@/types/trip";

const STEPS = [
  "누구랑 가요?",
  "언제 가요?",
  "어디로 가요?",
  "예산은 얼마 정도예요?",
  "어떤 여행을 좋아해요?",
];

const EMPTY: QuickStartAnswers = {
  name: "",
  companion: "friends",
  people: 2,
  startDate: "",
  endDate: "",
  region: "domestic",
  destination: "",
  wantsRecommendation: false,
  budgetPerPerson: 300000,
  styles: [],
};

export default function NewTripPage() {
  return (
    <ClientOnly>
      <QuickStartForm />
    </ClientOnly>
  );
}

function QuickStartForm() {
  const router = useRouter();
  // 임시 저장된 응답이 있으면 이어서 작성
  const [draft] = useState(() => loadDraft());
  const [answers, setAnswers] = useState<QuickStartAnswers>(() => {
    const saved = { ...draft };
    delete saved.step;
    return { ...EMPTY, ...saved };
  });
  const [step, setStep] = useState(draft.step ?? 0);
  const [error, setError] = useState("");
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);

  // 응답이 바뀔 때마다 임시 저장
  useEffect(() => {
    saveDraft({ ...answers, step });
  }, [answers, step]);

  // 단계가 바뀌면 첫 입력 필드로 포커스
  useEffect(() => {
    fieldsetRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }, [step]);

  const set = <K extends keyof QuickStartAnswers>(key: K, value: QuickStartAnswers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const toggleStyle = (style: Style) =>
    set(
      "styles",
      answers.styles.includes(style)
        ? answers.styles.filter((s) => s !== style)
        : [...answers.styles, style],
    );

  const isLast = step === STEPS.length - 1;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); // required/min/max 검사는 브라우저가 이미 통과시킨 상태
    setError("");

    if (isLast && answers.styles.length === 0) {
      setError("여행 스타일을 하나 이상 골라 주세요.");
      return;
    }
    if (!isLast) {
      setStep(step + 1); // Enter 키도 여기로 와서 "다음"처럼 동작
      return;
    }

    const trip = createTrip({
      ...answers,
      // TODO(F-02): 추천받기를 고르면 후보 3곳을 보여주고 선택하게 하기
      destination: answers.wantsRecommendation ? "미정" : answers.destination.trim(),
    });
    if (!upsertTrip(trip)) {
      setError("저장되지 않았습니다. 브라우저 저장 공간을 확인해 주세요.");
      return;
    }
    clearDraft();
    router.push(`/trip/${trip.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 진행 표시 */}
      <div className="space-y-2">
        <p className="text-sm text-slate-500">
          {step + 1} / {STEPS.length}
        </p>
        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-sky-700 transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <fieldset key={step} ref={fieldsetRef} className="space-y-5">
        <legend className="mb-5 text-2xl font-bold">{STEPS[step]}</legend>

        {step === 0 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LABELS.companion) as Companion[]).map((c) => (
                <label key={c} className={choice}>
                  <input
                    type="radio"
                    name="companion"
                    value={c}
                    required
                    checked={answers.companion === c}
                    onChange={() => {
                      set("companion", c);
                      if (c === "solo") set("people", 1);
                    }}
                  />
                  {LABELS.companion[c]}
                </label>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium">인원</span>
              <input
                type="number"
                className={input}
                min={1}
                max={20}
                required
                value={answers.people}
                onChange={(e) => set("people", Number(e.target.value))}
              />
            </label>
          </>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium">출발일</span>
              <input
                type="date"
                className={input}
                required
                min={todayISO()}
                value={answers.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">도착일 (최대 30일)</span>
              <input
                type="date"
                className={input}
                required
                min={answers.startDate || todayISO()}
                max={answers.startDate ? addDays(answers.startDate, 30) : undefined}
                value={answers.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LABELS.region) as Region[]).map((r) => (
                <label key={r} className={choice}>
                  <input
                    type="radio"
                    name="region"
                    value={r}
                    required
                    checked={answers.region === r}
                    onChange={() => set("region", r)}
                  />
                  {LABELS.region[r]}
                </label>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium">여행지</span>
              <input
                type="text"
                className={input}
                placeholder="예: 부산, 오사카"
                maxLength={30}
                required={!answers.wantsRecommendation}
                disabled={answers.wantsRecommendation}
                value={answers.destination}
                onChange={(e) => set("destination", e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={answers.wantsRecommendation}
                onChange={(e) => set("wantsRecommendation", e.target.checked)}
              />
              아직 못 정했어요, 추천받을래요
            </label>
          </>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <input
              type="range"
              className="w-full accent-sky-700"
              min={50000}
              max={5000000}
              step={10000}
              value={answers.budgetPerPerson}
              onChange={(e) => set("budgetPerPerson", Number(e.target.value))}
              aria-label="1인 예산"
            />
            <label className="block space-y-1">
              <span className="text-sm font-medium">1인 예산 (원)</span>
              <input
                type="number"
                className={input}
                min={50000}
                max={5000000}
                step={10000}
                required
                value={answers.budgetPerPerson}
                onChange={(e) => set("budgetPerPerson", Number(e.target.value))}
              />
            </label>
            <p className="text-sm text-slate-500">
              총예산 약 {(answers.budgetPerPerson * answers.people).toLocaleString("ko-KR")}원 ({answers.people}명)
            </p>
          </div>
        )}

        {step === 4 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LABELS.style) as Style[]).map((s) => (
                <label key={s} className={choice}>
                  <input
                    type="checkbox"
                    checked={answers.styles.includes(s)}
                    onChange={() => toggleStyle(s)}
                  />
                  {LABELS.style[s]}
                </label>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium">여행 이름 (선택)</span>
              <input
                type="text"
                className={input}
                maxLength={30}
                placeholder={`비워두면 "${answers.destination || "여행지"} 여행"`}
                value={answers.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
          </>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          className="rounded-lg border border-slate-300 px-5 py-3 disabled:opacity-40 dark:border-slate-600"
        >
          이전
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white hover:bg-sky-800"
        >
          {isLast ? "계획 만들기" : "다음"}
        </button>
      </div>
    </form>
  );
}
