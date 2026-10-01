// 화면과 엑셀이 같은 순서로 보여주도록 정렬 규칙을 한곳에 모은다

import {
  LABELS,
  PACKING_GROUPS,
  type BudgetCategory,
  type BudgetItem,
  type PackingItem,
  type Todo,
} from "@/types/trip";

/** 마감일 오름차순. 마감일이 없는 할 일은 맨 뒤로 */
export const sortTodos = (todos: Todo[]) =>
  [...todos].sort((a, b) => {
    if (!a.dueDate || !b.dueDate) return (a.dueDate ? 0 : 1) - (b.dueDate ? 0 : 1);
    return a.dueDate.localeCompare(b.dueDate);
  });

/** 분류 순서(PACKING_GROUPS)대로 정렬. 목록에 없는 분류는 맨 뒤 */
const groupIndex = (group: string) => {
  const i = (PACKING_GROUPS as readonly string[]).indexOf(group);
  return i === -1 ? PACKING_GROUPS.length : i;
};

export const sortPacking = (items: PackingItem[]) =>
  [...items].sort((a, b) => groupIndex(a.group) - groupIndex(b.group));

/** 분류별로 묶기: [["필수품", [...]], ["의류", [...]], ...] */
export const groupPacking = (items: PackingItem[]) => {
  const groups = new Map<string, PackingItem[]>();
  for (const item of sortPacking(items)) {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  }
  return [...groups.entries()];
};

/** 예산 카테고리 순서: 교통 → 숙소 → 식비 → 관광 → 기타 */
export const BUDGET_CATEGORIES = Object.keys(LABELS.budgetCategory) as BudgetCategory[];

/** 카테고리 순, 같은 카테고리 안에서는 예산 → 실제 지출 */
export const sortBudget = (items: BudgetItem[]) =>
  [...items].sort(
    (a, b) =>
      BUDGET_CATEGORIES.indexOf(a.category) - BUDGET_CATEGORIES.indexOf(b.category) ||
      (a.kind === b.kind ? 0 : a.kind === "plan" ? -1 : 1),
  );
