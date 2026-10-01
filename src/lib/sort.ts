// 화면과 엑셀이 같은 순서로 보여주도록 정렬 규칙을 한곳에 모은다

import { PACKING_GROUPS, type PackingItem, type Todo } from "@/types/trip";

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
