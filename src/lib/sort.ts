// 화면과 엑셀이 같은 순서로 보여주도록 정렬 규칙을 한곳에 모은다

import type { ExpenseRow, PackingRow, SlotRow, TodoRow } from "@/types/db";
import { LABELS, PACKING_GROUPS, type BudgetCategory, type Slot } from "@/types/trip";

/** 마감일 오름차순. 마감일이 없는 할 일은 맨 뒤로 */
export const sortTodos = (todos: TodoRow[]) =>
  [...todos].sort((a, b) => {
    if (!a.due_date || !b.due_date) return (a.due_date ? 0 : 1) - (b.due_date ? 0 : 1);
    return a.due_date.localeCompare(b.due_date);
  });

/** 분류 순서(PACKING_GROUPS)대로 정렬. 목록에 없는 분류는 맨 뒤 */
const groupIndex = (group: string) => {
  const i = (PACKING_GROUPS as readonly string[]).indexOf(group);
  return i === -1 ? PACKING_GROUPS.length : i;
};

export const sortPacking = (items: PackingRow[]) =>
  [...items].sort((a, b) => groupIndex(a.category) - groupIndex(b.category));

/** 분류별로 묶기: [["필수품", [...]], ["의류", [...]], ...] */
export const groupPacking = (items: PackingRow[]) => {
  const groups = new Map<string, PackingRow[]>();
  for (const item of sortPacking(items)) {
    groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  }
  return [...groups.entries()];
};

/** 예산 카테고리 순서: 교통 → 숙소 → 식비 → 관광 → 기타 */
export const BUDGET_CATEGORIES = Object.keys(LABELS.budgetCategory) as BudgetCategory[];

/** 카테고리 순, 같은 카테고리 안에서는 예산 → 실제 지출 */
export const sortExpenses = (items: ExpenseRow[]) =>
  [...items].sort(
    (a, b) =>
      BUDGET_CATEGORIES.indexOf(a.category) - BUDGET_CATEGORIES.indexOf(b.category) ||
      (a.kind === b.kind ? 0 : a.kind === "plan" ? -1 : 1),
  );

/** 시간대 순서: 오전 → 오후 → 저녁 */
export const SLOTS = Object.keys(LABELS.slot) as Slot[];

const markerOrder = (s: SlotRow) => (s.marker === "depart" ? 0 : s.marker === "return" ? 2 : 1);

/** 날짜 → 시간대 → (출발 슬롯 먼저, 귀가 슬롯 마지막) → 시간 순 */
export const sortSlots = (items: SlotRow[]) =>
  [...items].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) ||
      markerOrder(a) - markerOrder(b) ||
      a.time.localeCompare(b.time),
  );
