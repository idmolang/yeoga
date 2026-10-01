// 단계형 폼 상단의 진행 표시 (예: 2 / 5)

export default function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
        {step + 1} / {total}
      </p>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-sky-600 transition-all"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
