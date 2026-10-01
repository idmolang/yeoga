"use client";

// F-05 할 일 체크리스트: 마감일 순으로 보여주고 완료 체크·추가·삭제

import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { card, deleteButton, fieldLabel, input, primaryButton } from "@/components/styles";
import { addDays, ddayLabel } from "@/lib/date";
import { sortTodos } from "@/lib/sort";
import type { Todo, Trip } from "@/types/trip";

type Props = { trip: Trip; update: (next: Trip) => void };

const EMPTY_FORM = { title: "", dueDate: "", assignee: "" };
type Form = typeof EMPTY_FORM;

export default function TodoTab({ trip, update }: Props) {
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const maxDue = addDays(trip.startDate, -1); // 마감일은 출발일 이전

  const set = (key: keyof Form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); // required/max 검사는 브라우저가 이미 통과시킨 상태
    const title = form.title.trim();

    // 기본 속성으로 못 잡는 검사만 스크립트로
    const nextErrors: typeof errors = {};
    if (!title) nextErrors.title = "할 일을 입력해 주세요.";
    if (form.dueDate && form.dueDate > maxDue) nextErrors.dueDate = "마감일은 출발일 이전이어야 해요.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const todo: Todo = {
      id: crypto.randomUUID(),
      title,
      dueDate: form.dueDate,
      assignee: form.assignee.trim(),
      done: false,
      urgent: false,
    };
    update({ ...trip, todos: [...trip.todos, todo] });
    setForm(EMPTY_FORM);
  };

  const toggle = (id: string) =>
    update({ ...trip, todos: trip.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });

  const remove = (id: string) => update({ ...trip, todos: trip.todos.filter((t) => t.id !== id) });

  return (
    <section className="space-y-4">
      <form onSubmit={handleSubmit} className={card} aria-label="할 일 추가">
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>할 일</span>
            <input
              type="text"
              className={input}
              required
              maxLength={50}
              placeholder="예: 렌터카 보험 확인"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              aria-invalid={!!errors.title}
              aria-describedby="todo-title-error"
            />
          </label>
          <FieldError id="todo-title-error" message={errors.title} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block space-y-1">
              <span className={fieldLabel}>마감일 (선택, 출발일 전까지)</span>
              <input
                type="date"
                className={input}
                max={maxDue}
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                aria-invalid={!!errors.dueDate}
                aria-describedby="todo-due-error"
              />
            </label>
            <FieldError id="todo-due-error" message={errors.dueDate} />
          </div>
          <label className="block space-y-1">
            <span className={fieldLabel}>담당자 (선택)</span>
            <input
              type="text"
              className={input}
              maxLength={10}
              placeholder="예: 민지"
              value={form.assignee}
              onChange={(e) => set("assignee", e.target.value)}
            />
          </label>
        </div>
        <button type="submit" className={`w-full ${primaryButton}`}>
          할 일 추가
        </button>
      </form>

      {trip.todos.length === 0 && <p className="text-slate-500">할 일이 없어요. 위에서 추가해 보세요.</p>}

      <ul className="space-y-1">
        {sortTodos(trip.todos).map((todo) => (
          <li key={todo.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
            <label className="flex min-w-0 flex-1 items-center gap-3">
              <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
              <span className="min-w-0 flex-1">
                <span className={`break-words ${todo.done ? "text-slate-400 line-through" : ""}`}>
                  {todo.title}
                </span>
                {todo.assignee && (
                  <span className="ml-2 text-xs text-slate-500">@{todo.assignee}</span>
                )}
              </span>
            </label>
            {todo.urgent && !todo.done && (
              <span className="shrink-0 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">급함</span>
            )}
            <span className="w-14 shrink-0 text-right text-sm text-slate-500">
              {todo.dueDate ? ddayLabel(todo.dueDate) : "-"}
            </span>
            <button
              type="button"
              onClick={() => remove(todo.id)}
              className={deleteButton}
              aria-label={`${todo.title} 삭제`}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
