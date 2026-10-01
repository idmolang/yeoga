// 날짜는 모두 "YYYY-MM-DD" 문자열로 다룬다 (시간대 문제를 피하려고 UTC로 계산)

const DAY = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDays = (iso: string, days: number) =>
  new Date(toUTC(iso) + days * DAY).toISOString().slice(0, 10);

/** from → to 까지 며칠인지 (to가 더 늦으면 양수) */
export const diffDays = (from: string, to: string) =>
  Math.round((toUTC(to) - toUTC(from)) / DAY);

/** 시작일부터 종료일까지 모든 날짜 */
export const dateRange = (start: string, end: string) => {
  const days = diffDays(start, end);
  return Array.from({ length: Math.max(days, 0) + 1 }, (_, i) => addDays(start, i));
};

export const ddayLabel = (target: string) => {
  const n = diffDays(todayISO(), target);
  if (n > 0) return `D-${n}`;
  if (n === 0) return "D-day";
  return `D+${-n}`;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 요일 (0=일요일) */
export const weekday = (iso: string) => new Date(toUTC(iso)).getUTCDay();
export const weekdayLabel = (iso: string) => WEEKDAYS[weekday(iso)];

/** "11월 10일 (월)" */
export const formatKDate = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일 (${weekdayLabel(iso)})`;
};

/** "11.10 ~ 11.13" 처럼 짧은 기간 */
export const formatRange = (start: string, end: string) => {
  const short = (iso: string) => {
    const [, m, d] = iso.split("-").map(Number);
    return `${m}.${d}`;
  };
  return start === end ? short(start) : `${short(start)} ~ ${short(end)}`;
};
