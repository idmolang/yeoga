// F-02 초대 공유: 링크와 단톡방용 문구

import { formatKDate } from "@/lib/date";
import type { TripRow } from "@/types/db";

export const inviteUrl = (origin: string, code: string) => `${origin}/t/${code}`;

export function inviteMessage(trip: Pick<TripRow, "name" | "response_deadline">, url: string) {
  return [
    `[여가] "${trip.name}" 같이 가자! ✈️`,
    `가능한 날짜랑 예산을 알려줘 (${formatKDate(trip.response_deadline)}까지)`,
    url,
  ].join("\n");
}
