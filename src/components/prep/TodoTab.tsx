"use client";

// F-10 할 일: 마감일 순으로 보여주고 완료 체크·추가·삭제, 참여자 중 담당자 배정 (v0.1 TodoTab을 DB 버전으로)

import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import BookingLinks from "@/components/prep/BookingLinks";
import { useRoomContext } from "@/components/room/RoomContext";
import { badge, badgeTone, card, deleteButton, fieldLabel, input, muted, primaryButton } from "@/components/styles";
import { kindOfTodo } from "@/lib/booking";
import { addDays, ddayLabel } from "@/lib/date";
import { deleteRow, insertRow, updateRow } from "@/lib/db";
import { sortTodos } from "@/lib/sort";
import { useValidation } from "@/lib/validation";

const EMPTY_FORM = { title: "", dueDate: "", assignee: "" };

export default function TodoTab() {
  const { data, supabase, run, going, nameOf } = useRoomContext();
  const { trip, todos } = data;
  const v = useValidation("todo");
  const [form, setForm] = useState(EMPTY_FORM);
  const maxDue = addDays(trip.start_date!, -1); // 마감일은 출발 전날까지
  const set = (key: keyof typeof EMPTY_FORM, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!v.validate(e.currentTarget)) return;
    const ok = await run(() =>
      insertRow(supabase, "todos", {
        trip_id: trip.id,
        title: form.title.trim(),
        due_date: form.dueDate || null,
        assignee_id: form.assignee || null,
      }),
    );
    if (ok) setForm(EMPTY_FORM);
  };

  const doneCount = todos.filter((t) => t.done).length;

  return (
    <section className="space-y-4">
      <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className={card} aria-label="할 일 추가">
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>할 일</span>
            <input {...v.field("title")} className={input} required maxLength={50} placeholder="예: 렌터카 보험 확인" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <FieldError id={v.errorId("title")} message={v.errors.title} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block space-y-1">
              <span className={fieldLabel}>마감일 (선택)</span>
              <input {...v.field("dueDate")} type="date" className={input} max={maxDue} value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </label>
            <FieldError id={v.errorId("dueDate")} message={v.errors.dueDate} />
          </div>
          <label className="block space-y-1">
            <span className={fieldLabel}>담당자 (선택)</span>
            <select className={input} name="assignee" value={form.assignee} onChange={(e) => set("assignee", e.target.value)}>
              <option value="">정하지 않음</option>
              {going.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className={`w-full ${primaryButton}`}>할 일 추가</button>
      </form>

      <p className={muted}>{todos.length === 0 ? "할 일이 없어요. 위에서 추가해 보세요." : `${doneCount} / ${todos.length}개 완료`}</p>

      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {sortTodos(todos).map((todo) => (
          <li key={todo.id} className="space-y-1.5 py-2.5">
            <div className="flex items-center gap-3">
              <label className="flex min-w-0 flex-1 items-center gap-3">
                <input type="checkbox" className="size-4 shrink-0" checked={todo.done} onChange={() => run(() => updateRow(supabase, "todos", todo.id, { done: !todo.done }))} />
                <span className={`min-w-0 ${todo.done ? "text-slate-400 line-through" : ""}`}>{todo.title}</span>
              </label>
              {todo.urgent && !todo.done && <span className={`${badge} ${badgeTone.red}`}>급함</span>}
              <span className="w-12 shrink-0 text-right text-sm text-slate-500 dark:text-slate-400">{todo.due_date ? ddayLabel(todo.due_date) : "-"}</span>
              <button type="button" onClick={() => run(() => deleteRow(supabase, "todos", todo.id))} className={deleteButton} aria-label={`${todo.title} 삭제`}>
                삭제
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-7">
              <label className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <span>담당</span>
                <select
                  className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
                  value={todo.assignee_id ?? ""}
                  onChange={(e) => run(() => updateRow(supabase, "todos", todo.id, { assignee_id: e.target.value || null }))}
                  aria-label={`${todo.title} 담당자`}
                >
                  <option value="">없음</option>
                  {going.map((m) => (
                    <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                  ))}
                  {todo.assignee_id && !going.some((m) => m.user_id === todo.assignee_id) && (
                    <option value={todo.assignee_id}>{nameOf(todo.assignee_id)}</option>
                  )}
                </select>
              </label>
              {kindOfTodo(todo.title) && <BookingLinks kinds={[kindOfTodo(todo.title)!]} compact />}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
