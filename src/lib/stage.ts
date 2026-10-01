// 여행방의 단계: 모으기 → 조율 → 준비

import { diffDays, todayISO } from "@/lib/date";
import type { TripRow } from "@/types/db";

export type Stage = "gather" | "coordinate" | "prepare";
export const STAGES: { id: Stage; label: string }[] = [
  { id: "gather", label: "모으기" },
  { id: "coordinate", label: "조율" },
  { id: "prepare", label: "준비" },
];
export const stageLabel = (s: Stage) => STAGES.find((x) => x.id === s)!.label;

/** 확정 → 준비, 응답이 하나라도 들어오면 → 조율, 그 전 → 모으기 */
export function stageOf(trip: Pick<TripRow, "status">, responseCount: number): Stage {
  if (trip.status === "confirmed") return "prepare";
  return responseCount > 0 ? "coordinate" : "gather";
}

/** 응답을 받을 수 있는가 (DB의 responses_open() 과 같은 규칙) */
export const responsesOpen = (trip: Pick<TripRow, "status" | "response_deadline">) =>
  trip.status === "collecting" && diffDays(todayISO(), trip.response_deadline) >= 0;

/** 목록·헤더에 보여줄 D-day 문구 */
export function ddayText(trip: Pick<TripRow, "status" | "start_date" | "response_deadline">) {
  if (trip.status === "confirmed" && trip.start_date) {
    const n = diffDays(todayISO(), trip.start_date);
    return n > 0 ? `출발 D-${n}` : n === 0 ? "오늘 출발" : "여행 중·다녀옴";
  }
  if (trip.status === "closed") return "응답 마감됨";
  const n = diffDays(todayISO(), trip.response_deadline);
  return n > 0 ? `응답 마감 D-${n}` : n === 0 ? "오늘 응답 마감" : "응답 마감됨";
}
