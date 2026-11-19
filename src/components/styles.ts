// 디자인 체계: 여백·글자 크기·카드·버튼을 이 파일 하나로 통일한다 (N-08)
// 색·라운드·모션 값은 globals.css 의 토큰을 쓴다 (toss.md 시각 언어 + 푸른 하늘 강조색)
// 글자: 제목 24 → 섹션 18 → 소제목 17 → 본문 15 → 보조 13 → 배지 12
// 여백: 4px 단위. 페이지 섹션 사이 6, 카드 안 4, 목록 항목 2

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

// 글자
export const h1 = "text-2xl font-bold tracking-[-0.02em]";
export const h2 = "text-lg font-semibold tracking-[-0.01em]";
export const h3 = "text-[17px] font-semibold tracking-[-0.01em]";
export const muted = "text-sm text-text-tertiary";
/** 화면 위쪽의 큰 제목(28px Bold)과 한 줄 설명 */
export const pageTitle = "text-[28px] font-bold leading-[1.3] tracking-[-0.02em]";
export const pageDesc = "text-[15px] text-text-tertiary";
/** 목록 행: 왼쪽 라벨 + 오른쪽 값. 부모에 divide-y divide-line */
export const row = "flex items-center justify-between gap-4 py-3.5";
export const rowGroup = "divide-y divide-line rounded-xl bg-surface px-4 ring-1 ring-line";

// 상자
export const card =
  "space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-5";
export const subtleBox = "rounded-lg bg-surface-sunken px-4 py-3 text-sm";

// 버튼: 크기 M40 / L48 / XL56. 채움 버튼의 눌림은 검정 26% overlay, 비활성은 전체 opacity 0.30
const size = {
  m: "min-h-10 rounded-lg px-4 text-[15px] font-semibold",
  l: "min-h-12 rounded-xl px-5 text-[17px] font-bold",
  xl: "min-h-14 rounded-xl px-6 text-[17px] font-bold",
};
const button = `relative inline-flex select-none items-center justify-center gap-2 overflow-hidden transition-colors duration-(--dur-fast) ease-(--ease) disabled:cursor-not-allowed disabled:opacity-30 ${focus}`;
const overlay =
  "after:pointer-events-none after:absolute after:inset-0 after:bg-black/0 after:transition-colors after:duration-(--dur-fast) hover:after:bg-black/10 active:after:bg-black/25";
const filled = (s: keyof typeof size) => `${button} ${size[s]} ${overlay} bg-brand-600 text-white`;
export const primaryButton = filled("m");
export const primaryButtonL = filled("l");
export const primaryButtonXl = filled("xl");
export const secondaryButton = `${button} ${size.m} bg-surface-sunken text-foreground hover:bg-line active:bg-line`;
export const ghostButton = `${button} ${size.m} text-brand-text hover:bg-brand-50 active:bg-brand-50`;
export const dangerButton = `${button} ${size.m} text-red-600 hover:bg-red-50 active:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 dark:active:bg-red-950`;
export const deleteButton = `shrink-0 rounded-md px-2 py-1 text-sm text-text-tertiary transition-colors duration-(--dur-fast) hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-950 ${focus}`;

// 입력: 높이 48, 회색 바탕 + 1px 헤어라인. 포커스는 흰 바탕 + 1.5px 강조색, 오류는 1.5px 빨강
// (글자 크기는 globals.css 에서 16px 이상으로 고정)
export const input =
  "min-h-12 w-full min-w-0 rounded-lg border border-line bg-surface-sunken px-4 py-3 text-foreground placeholder:text-text-tertiary transition-colors duration-(--dur-base) ease-(--ease) focus:border-brand-500 focus:bg-surface focus:shadow-[0_0_0_0.5px_var(--brand-500)] focus:outline-none aria-[invalid=true]:border-red-500 aria-[invalid=true]:shadow-[0_0_0_0.5px_var(--color-red-500)] disabled:opacity-30";
export const fieldLabel = "text-sm font-medium";
export const fieldError = "text-sm text-red-600 dark:text-red-400";
/** 라디오·체크박스를 카드처럼 보이게 (선택되면 강조색 테두리) */
export const choice =
  "flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors duration-(--dur-base) ease-(--ease) has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:disabled]:cursor-not-allowed";

// 배지
export const badge = "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium";
export const badgeTone = {
  gray: "bg-surface-sunken text-text-secondary",
  sky: "bg-brand-50 text-brand-text",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};
