// 화면과 엑셀이 같은 순서로 보여주도록 정렬 규칙을 한곳에 모은다

import type { Todo } from "@/types/trip";

/** 마감일 오름차순. 마감일이 없는 할 일은 맨 뒤로 */
export const sortTodos = (todos: Todo[]) =>
  [...todos].sort((a, b) => {
    if (!a.dueDate || !b.dueDate) return (a.dueDate ? 0 : 1) - (b.dueDate ? 0 : 1);
    return a.dueDate.localeCompare(b.dueDate);
  });
