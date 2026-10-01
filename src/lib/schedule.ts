// 일정 시간대 규칙 (FRD 9장)
// - 시간은 12시 전 오전, 18시 전 오후, 그 뒤 저녁
// - "출발·이동"은 출발 시간대에, "귀가"는 귀가 시간대에 넣고, 출발 전·귀가 후 슬롯은 만들지 않는다
// - 시간 미입력이면 첫날 오전 출발, 마지막 날 저녁 귀가. 당일치기는 출발 시간대~귀가 시간대만

import { dateRange } from "@/lib/date";
import type { SlotRow } from "@/types/db";
import type { Slot } from "@/types/trip";

export const SLOT_ORDER: Slot[] = ["morning", "afternoon", "evening"];
const idx = (s: Slot) => SLOT_ORDER.indexOf(s);

export const slotFromTime = (time: string): Slot => {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

export interface Times {
  startDate: string;
  endDate: string;
  departTime: string; // "" = 미입력
  returnTime: string;
}

export const departSlot = (t: Times): Slot => (t.departTime ? slotFromTime(t.departTime) : "morning");
export const returnSlot = (t: Times): Slot => (t.returnTime ? slotFromTime(t.returnTime) : "evening");

/** 그 날짜에 둘 수 있는 시간대 (첫날은 출발 시간대부터, 마지막 날은 귀가 시간대까지) */
export function allowedSlots(date: string, t: Times): Slot[] {
  const from = date === t.startDate ? idx(departSlot(t)) : 0;
  const to = date === t.endDate ? idx(returnSlot(t)) : SLOT_ORDER.length - 1;
  return SLOT_ORDER.slice(from, to + 1);
}

export const DEPART_ACTIVITY = "출발·이동";
export const RETURN_ACTIVITY = "귀가";

export interface NewSlot {
  date: string;
  slot: Slot;
  time: string;
  activity: string;
  marker: "depart" | "return" | null;
}

const departItem = (t: Times): NewSlot => ({ date: t.startDate, slot: departSlot(t), time: t.departTime, activity: DEPART_ACTIVITY, marker: "depart" });
const returnItem = (t: Times): NewSlot => ({ date: t.endDate, slot: returnSlot(t), time: t.returnTime, activity: RETURN_ACTIVITY, marker: "return" });

/** 확정할 때 만드는 일정 틀 */
export function buildSchedule(t: Times): NewSlot[] {
  return dateRange(t.startDate, t.endDate).flatMap((date) =>
    allowedSlots(date, t).flatMap((slot): NewSlot[] => {
      const items: NewSlot[] = [];
      if (date === t.startDate && slot === departSlot(t)) items.push(departItem(t));
      if (date === t.endDate && slot === returnSlot(t)) items.push(returnItem(t));
      return items.length ? items : [{ date, slot, time: "", activity: "", marker: null }];
    }),
  );
}

/** 사용자가 내용을 넣은 슬롯인가 (사라질 때 확인을 받는다) */
export const slotHasContent = (s: Pick<SlotRow, "place" | "activity" | "memo" | "cost" | "marker">) =>
  !!(s.place || s.memo || s.cost || (s.activity && !s.marker));

/**
 * 확정 후 출발·귀가 시간을 바꿀 때 첫날·마지막 날 슬롯을 다시 배치한다.
 * - 출발 전·귀가 후가 된 슬롯은 지운다 (내용이 있으면 lost 에 담아 확인받게)
 * - 출발·귀가 슬롯은 새 시간대·시간으로 옮긴다 (없어졌으면 새로 만든다)
 * - 새로 생긴 시간대(예: 출발이 오후 → 오전)에는 빈 슬롯을 만든다
 */
export function relayout(slots: SlotRow[], next: Times) {
  const boundary = new Set([next.startDate, next.endDate]);
  const deletes: SlotRow[] = [];
  const updates: { id: string; patch: Partial<SlotRow> }[] = [];
  const inserts: NewSlot[] = [];
  // 작업 후 (날짜, 시간대)에 남는 슬롯 수
  const remaining = new Map<string, number>();
  const key = (date: string, slot: Slot) => `${date}|${slot}`;
  const bump = (date: string, slot: Slot) => remaining.set(key(date, slot), (remaining.get(key(date, slot)) ?? 0) + 1);

  const markers = { depart: departItem(next), return: returnItem(next) };
  const markerSlots = new Set([key(markers.depart.date, markers.depart.slot), key(markers.return.date, markers.return.slot)]);

  for (const s of slots) {
    if (s.marker) continue;
    if (!boundary.has(s.date)) {
      bump(s.date, s.slot);
      continue;
    }
    const allowed = allowedSlots(s.date, next).includes(s.slot);
    // 출발·귀가 슬롯이 들어갈 자리의 빈 슬롯은 정리 (빈칸이 두 개 생기지 않게)
    const emptyInMarkerSlot = markerSlots.has(key(s.date, s.slot)) && !slotHasContent(s);
    if (!allowed || emptyInMarkerSlot) deletes.push(s);
    else bump(s.date, s.slot);
  }

  for (const kind of ["depart", "return"] as const) {
    const target = markers[kind];
    const existing = slots.filter((s) => s.marker === kind);
    if (existing.length === 0) inserts.push(target);
    else {
      const [first, ...extra] = existing;
      updates.push({
        id: first.id,
        patch: { date: target.date, slot: target.slot, time: target.time, activity: first.activity || target.activity },
      });
      deletes.push(...extra);
    }
    bump(target.date, target.slot);
  }

  // 새로 허용된 시간대가 비어 있으면 빈 슬롯 추가
  for (const date of boundary) {
    for (const slot of allowedSlots(date, next)) {
      if (!remaining.get(key(date, slot))) {
        inserts.push({ date, slot, time: "", activity: "", marker: null });
        bump(date, slot);
      }
    }
  }

  const lost = deletes.filter((s) => !s.marker && slotHasContent(s));
  return { deletes, updates, inserts, lost };
}
