// 디자인 체계: 여백·글자 크기·카드·버튼을 이 파일 하나로 통일한다 (N-08)
// 글자: 제목 2xl → 섹션 lg → 소제목 base → 본문 base → 보조 sm → 배지 xs
// 여백: 페이지 섹션 사이 6, 카드 안 4, 목록 항목 2

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";

// 글자
export const h1 = "text-2xl font-bold tracking-tight";
export const h2 = "text-lg font-semibold";
export const h3 = "text-base font-semibold";
export const muted = "text-sm text-slate-500 dark:text-slate-400";

// 상자
export const card =
  "space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900";
export const subtleBox = "rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800/70";

// 버튼
const button = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
export const primaryButton = `${button} bg-sky-700 text-white hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500`;
export const secondaryButton = `${button} border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800`;
export const ghostButton = `${button} text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950`;
export const dangerButton = `${button} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950`;
export const deleteButton = `shrink-0 rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 ${focus}`;

// 입력
export const input =
  "w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base aria-[invalid=true]:border-red-500 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-800";
export const fieldLabel = "text-sm font-medium";
export const fieldError = "text-sm text-red-600 dark:text-red-400";
/** 라디오·체크박스를 카드처럼 보이게 (선택되면 파란 테두리) */
export const choice =
  "flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-600 dark:border-slate-700 dark:has-[:checked]:bg-sky-950";

// 배지
export const badge = "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-medium";
export const badgeTone = {
  gray: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};
