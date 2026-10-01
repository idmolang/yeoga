// 후보 시기 달력. 두 가지 모드:
// - select: 가능한 날짜 다중 선택 (각 날짜가 checkbox, 키보드 Tab/Space 로 선택)
// - heat:   날짜별 가능 인원을 색 진하기로 표시

import { formatKDate, weekday } from "@/lib/date";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/** 날짜들을 "YYYY-MM" 달별로 묶기 */
function byMonth(dates: string[]) {
  const months = new Map<string, string[]>();
  for (const d of dates) months.set(d.slice(0, 7), [...(months.get(d.slice(0, 7)) ?? []), d]);
  return [...months.entries()];
}

const dayNum = (iso: string) => Number(iso.slice(8));

type Props =
  | { mode: "select"; dates: string[]; selected: Set<string>; onToggle: (date: string) => void; name: string; describedBy?: string }
  | { mode: "heat"; dates: string[]; counts: Map<string, number>; total: number; names?: Map<string, string[]> };

export default function DateCalendar(props: Props) {
  return (
    <div className="space-y-5">
      {byMonth(props.dates).map(([month, days]) => {
        const [y, m] = month.split("-").map(Number);
        const blanks = weekday(days[0]);
        return (
          <div key={month} className="space-y-2">
            <p className="text-sm font-semibold">
              {y}년 {m}월
            </p>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 dark:text-slate-400" aria-hidden>
              {WEEK.map((w, i) => (
                <span key={w} className={i === 0 ? "text-red-500" : i === 6 ? "text-sky-600" : ""}>
                  {w}
                </span>
              ))}
            </div>
            <ul className="grid grid-cols-7 gap-1">
              {Array.from({ length: blanks }, (_, i) => (
                <li key={`b${i}`} aria-hidden />
              ))}
              {days.map((date) => (
                <li key={date}>{props.mode === "select" ? <SelectCell {...props} date={date} /> : <HeatCell {...props} date={date} />}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function SelectCell({
  date,
  selected,
  onToggle,
  name,
  describedBy,
}: Extract<Props, { mode: "select" }> & { date: string }) {
  const checked = selected.has(date);
  return (
    <label className="block cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value={date}
        className="peer sr-only"
        checked={checked}
        onChange={() => onToggle(date)}
        aria-label={formatKDate(date)}
        aria-describedby={describedBy}
      />
      <span className="flex aspect-square items-center justify-center rounded-lg border border-slate-200 text-sm font-medium transition peer-checked:border-sky-600 peer-checked:bg-sky-600 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-sky-600 dark:border-slate-700 dark:peer-checked:bg-sky-500">
        {dayNum(date)}
      </span>
    </label>
  );
}

function HeatCell({ date, counts, total, names }: Extract<Props, { mode: "heat" }> & { date: string }) {
  const n = counts.get(date) ?? 0;
  const ratio = total > 0 ? n / total : 0;
  const all = total > 0 && n === total;
  const who = names?.get(date) ?? [];
  const label = `${formatKDate(date)}: ${total}명 중 ${n}명 가능${who.length ? ` (${who.join(", ")})` : ""}`;
  return (
    <div
      title={label}
      className={`flex aspect-square flex-col items-center justify-center rounded-lg bg-slate-100 text-xs leading-tight dark:bg-slate-800 ${
        all ? "font-bold text-white ring-2 ring-sky-900 dark:ring-sky-300" : ratio >= 0.6 ? "text-white" : ""
      }`}
      style={{ backgroundColor: ratio > 0 ? `rgba(2, 132, 199, ${0.15 + ratio * 0.85})` : undefined }}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden className="text-sm">{dayNum(date)}</span>
      <span aria-hidden className={ratio > 0 ? "" : "text-slate-400"}>
        {n}/{total}
      </span>
    </div>
  );
}
