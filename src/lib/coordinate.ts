// F-06 조율 규칙 (FRD 8장): 참여자 응답 → 날짜·예산·스타일·여행지 집계와 추천값
// 화면(대시보드·확정 폼)과 엑셀이 모두 이 결과 하나를 쓴다.

import { addDays, dateRange, diffDays } from "@/lib/date";
import type { DepartSlot, RoomData } from "@/types/db";
import { LABELS, type Style } from "@/types/trip";

export interface DayAvailability {
  date: string;
  available: string[]; // user id
  unavailable: string[];
}

export interface Period {
  start: string;
  end: string;
  days: number;
  count: number; // 그 기간 내내 가능한 인원
  missing: string[]; // 그 기간 중 하루라도 안 되는 사람 (차선 기간일 때)
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** 조건을 만족하는 날짜가 연속되는 구간들 */
function runs(days: DayAvailability[], ok: (d: DayAvailability) => boolean) {
  const result: DayAvailability[][] = [];
  let current: DayAvailability[] = [];
  days.forEach((d, i) => {
    const continues = i > 0 && diffDays(days[i - 1].date, d.date) === 1;
    if (ok(d) && (current.length === 0 || continues)) current.push(d);
    else {
      if (current.length) result.push(current);
      current = ok(d) ? [d] : [];
    }
  });
  if (current.length) result.push(current);
  return result;
}

/** 길이가 긴 순, 같으면 빠른 순 */
const byLengthThenDate = (a: DayAvailability[], b: DayAvailability[]) =>
  b.length - a.length || a[0].date.localeCompare(b[0].date);

function toPeriod(run: DayAvailability[], responders: string[]): Period {
  const everyDay = responders.filter((u) => run.every((d) => d.available.includes(u)));
  return {
    start: run[0].date,
    end: run[run.length - 1].date,
    days: run.length,
    count: everyDay.length,
    missing: responders.filter((u) => !everyDay.includes(u)),
  };
}

export function coordinate(data: RoomData) {
  const { trip, responses, options, votes } = data;
  const responders = responses.map((r) => r.user_id);
  const n = responders.length;

  // ── 날짜 ──
  const days: DayAvailability[] = dateRange(trip.window_start, trip.window_end).map((date) => {
    const available = responses.filter((r) => r.available_dates.includes(date)).map((r) => r.user_id);
    return { date, available, unavailable: responders.filter((u) => !available.includes(u)) };
  });

  // 전원 가능한 2일 이상 연속 구간: 긴 순 → 빠른 순, 최대 3개
  const periods =
    n === 0
      ? []
      : runs(days, (d) => d.available.length === n)
          .filter((r) => r.length >= 2)
          .sort(byLengthThenDate)
          .slice(0, 3)
          .map((r) => toPeriod(r, responders));

  // 없으면 차선: 가능 인원 기준을 한 명씩 낮추며 2일 이상 연속 구간을 찾는다 (빠지는 사람 표시)
  let fallback: Period | null = null;
  if (n > 0 && periods.length === 0) {
    for (let need = n - 1; need >= 1 && !fallback; need--) {
      const best = runs(days, (d) => d.available.length >= need)
        .filter((r) => r.length >= 2)
        .map((r) => toPeriod(r, responders))
        .sort((a, b) => b.count - a.count || b.days - a.days || a.start.localeCompare(b.start))[0];
      if (best && best.count >= 1) fallback = best;
    }
    // 그래도 없으면 가장 많이 되는 하루
    if (!fallback) {
      const day = [...days].sort((a, b) => b.available.length - a.available.length)[0];
      if (day && day.available.length > 0) fallback = toPeriod([day], responders);
    }
  }

  // ── 예산 ──
  const budgets = responses.map((r) => r.budget).sort((a, b) => a - b);
  const median =
    n === 0 ? 0 : n % 2 === 1 ? budgets[(n - 1) / 2] : (budgets[n / 2 - 1] + budgets[n / 2]) / 2;
  const min = budgets[0] ?? 0;
  const max = budgets[n - 1] ?? 0;
  // 추천 = 중간값을 1만 원 단위로 내림, 단 최소값보다 낮아지지 않게
  const recommendedBudget = n === 0 ? 0 : Math.max(Math.floor(median / 10000) * 10000, min);
  // 응답 분포: 10만 원 단위 구간별 인원
  const buckets = new Map<number, number>();
  for (const b of budgets) {
    const key = Math.floor(b / 100000) * 100000;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  // ── 스타일 ──
  const styleCounts = (Object.keys(LABELS.style) as Style[]).map((style) => ({
    style,
    count: responses.filter((r) => r.styles.includes(style)).length,
  }));
  const majority = styleCounts.filter((s) => s.count > n / 2).map((s) => s.style);
  const top = [...styleCounts].sort((a, b) => b.count - a.count)[0];
  // 과반이 고른 스타일, 없으면 1위
  const planStyles: Style[] = majority.length > 0 ? majority : top && top.count > 0 ? [top.style] : [];

  // ── 출발 시간대 ──
  const departCounts = (["morning", "afternoon", "evening", "any"] as DepartSlot[]).map((slot) => ({
    slot,
    count: responses.filter((r) => r.depart_slot === slot).length,
  }));

  // ── 여행지: 득표순, 동점이면 먼저 제안된 곳 ──
  const destinations = options
    .map((o, order) => ({
      option: o,
      order,
      voters: votes.filter((v) => v.option_id === o.id).map((v) => v.user_id),
    }))
    .sort((a, b) => b.voters.length - a.voters.length || a.order - b.order);

  // ── 확정 폼 기본값 ──
  const bestPeriod = periods[0] ?? fallback;
  const suggested = {
    startDate: bestPeriod?.start ?? trip.window_start,
    // 확정 기간은 최대 30일 (31일 이상 연속 가능해도 앞쪽 30박까지만 제안)
    endDate: bestPeriod ? (bestPeriod.days > 31 ? addDays(bestPeriod.start, 30) : bestPeriod.end) : trip.window_start,
    destination: trip.destination_fixed ? (trip.destination ?? "") : (destinations[0]?.option.name ?? ""),
    budget: recommendedBudget || 300000,
    styles: planStyles.length > 0 ? planStyles : (["sightseeing"] as Style[]),
    going: responders.length > 0 ? responders : data.members.map((m) => m.user_id),
  };

  return {
    responders,
    responseCount: n,
    memberCount: data.members.length,
    days,
    periods,
    fallback,
    budget: { min, max, median, recommended: recommendedBudget, average: n ? sum(budgets) / n : 0, buckets: [...buckets.entries()].sort((a, b) => a[0] - b[0]) },
    styleCounts,
    majority,
    planStyles,
    departCounts,
    destinations,
    suggested,
  };
}

export type Coordination = ReturnType<typeof coordinate>;

/** 확정하려는 예산이 최소 희망 예산보다 30% 이상 높으면 경고 (FRD 8장) */
export const budgetTooHigh = (budget: number, min: number) => min > 0 && budget >= min * 1.3;
