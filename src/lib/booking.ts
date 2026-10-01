// F-15 예약 사이트 바로가기: 여행 정보에 맞는 사이트와 링크를 고른다 (FRD 11장)

import { BOOKING_SITES, type BookingKind, type SearchInput } from "@/data/booking-sites";
import destinations from "@/data/destinations.json";
import type { TripRow } from "@/types/db";

/** 여행지 데이터에 있는 공항 코드 (직접 입력한 여행지는 없음 → 첫 화면으로) */
export const airportOf = (destination: string) =>
  (destinations as { name: string; airport?: string }[]).find((d) => d.name === destination.trim())?.airport;

/** 표시할 종류: 항공(해외, 또는 국내 중 공항 코드가 있는 곳), 숙소(항상), 국내 교통(국내) */
export function kindsFor(trip: Pick<TripRow, "region" | "destination">): BookingKind[] {
  const kinds: BookingKind[] = [];
  if (trip.region === "overseas" || airportOf(trip.destination ?? "")) kinds.push("flight");
  kinds.push("stay");
  if (trip.region === "domestic") kinds.push("transit");
  return kinds;
}

export function bookingLinks(trip: TripRow, people: number, kinds: BookingKind[]) {
  const q: SearchInput | null =
    trip.start_date && trip.end_date && trip.destination
      ? {
          destination: trip.destination,
          airport: airportOf(trip.destination),
          startDate: trip.start_date,
          endDate: trip.end_date,
          people: Math.max(people, 1),
          overseas: trip.region === "overseas",
        }
      : null;
  return BOOKING_SITES.filter((s) => kinds.includes(s.kind)).map((s) => {
    const search = q && s.search ? s.search(q) : null;
    return { id: s.id, name: s.name, kind: s.kind, url: search ?? s.home, prefilled: !!search };
  });
}

/** 할 일 제목으로 어떤 예약인지 판단 ("항공권 예매", "숙소 예약", "교통편 예매 …") */
export function kindOfTodo(title: string): BookingKind | null {
  if (title.includes("항공권")) return "flight";
  if (title.includes("숙소")) return "stay";
  if (title.includes("교통편")) return "transit";
  return null;
}
