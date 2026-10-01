// 여행 화면 상단의 단계 표시: 모으기 → 조율 → 준비

import { STAGES, type Stage } from "@/lib/stage";

export default function StageStepper({ stage }: { stage: Stage }) {
  const current = STAGES.findIndex((s) => s.id === stage);
  return (
    <ol className="flex items-center gap-1.5 text-sm" aria-label="여행 단계">
      {STAGES.map((s, i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        return (
          <li key={s.id} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300 dark:text-slate-600" aria-hidden>→</span>}
            <span
              aria-current={state === "now" ? "step" : undefined}
              className={`rounded-full px-2.5 py-1 font-medium ${
                state === "now"
                  ? "bg-sky-700 text-white dark:bg-sky-600"
                  : state === "done"
                    ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
              }`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
