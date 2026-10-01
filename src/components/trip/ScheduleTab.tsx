"use client";

// F-04 일정 관리: 날짜·시간순으로 보여주고, 슬롯을 눌러 수정하거나 새 일정을 추가·삭제한다.
// "예약 필요"를 체크해 저장하면 할 일 목록에 "{장소} 예약하기"를 자동으로 추가한다.

import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { card, fieldLabel, input, primaryButton, secondaryButton } from "@/components/styles";
import { dateRange } from "@/lib/date";
import { bookingTodoTitle, makeBookingTodo } from "@/lib/generate";
import { slotFromTime, sortSchedule } from "@/lib/sort";
import { LABELS, type ScheduleItem, type Slot, type Trip } from "@/types/trip";

type Props = { trip: Trip; update: (next: Trip) => void };

/** 수정 중인 슬롯 id, 또는 새 일정을 추가할 날짜 */
type Editing = { kind: "edit"; id: string } | { kind: "new"; date: string } | null;

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function ScheduleTab({ trip, update }: Props) {
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState("");

  const items = sortSchedule(trip.schedule);
  // 기간 안의 모든 날짜를 보여준다 (슬롯을 다 지운 날에도 추가할 수 있게)
  const days = [...new Set([...dateRange(trip.startDate, trip.endDate), ...items.map((s) => s.date)])].sort();
  const totalCost = items.reduce((sum, s) => sum + s.cost, 0);

  const save = (item: ScheduleItem) => {
    const schedule = item.id
      ? trip.schedule.map((s) => (s.id === item.id ? item : s))
      : [...trip.schedule, { ...item, id: crypto.randomUUID() }];

    // 예약 필요 → 같은 제목의 할 일이 없을 때만 추가 (다시 저장해도 중복되지 않게)
    let todos = trip.todos;
    let message = "";
    if (item.needsBooking) {
      const title = bookingTodoTitle(item.place);
      if (!todos.some((t) => t.title === title)) {
        todos = [...todos, makeBookingTodo(trip.startDate, item.place)];
        message = `할 일 목록에 "${title}"을(를) 추가했어요.`;
      }
    }

    update({ ...trip, schedule, todos });
    setNotice(message);
    setEditing(null);
  };

  const remove = (id: string) => {
    update({ ...trip, schedule: trip.schedule.filter((s) => s.id !== id) });
    setNotice("");
    setEditing(null);
  };

  return (
    <section className="space-y-6">
      {totalCost > 0 && <p className="text-sm text-slate-500">예상 비용 합계 {won(totalCost)}</p>}
      {notice && (
        <p role="status" className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:bg-sky-950 dark:text-sky-200">
          {notice}
        </p>
      )}

      {days.map((date, i) => {
        const dayItems = items.filter((s) => s.date === date);
        return (
          <div key={date} className="space-y-2">
            <h3 className="font-semibold">
              {i + 1}일차 <span className="text-sm font-normal text-slate-500">{date}</span>
            </h3>

            <ul className="space-y-1">
              {dayItems.map((s) => {
                const open = editing?.kind === "edit" && editing.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(open ? null : { kind: "edit", id: s.id })}
                      aria-expanded={open}
                      className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <span className="w-12 shrink-0 text-slate-500">{s.time || LABELS.slot[s.slot]}</span>
                      <span className="min-w-0 flex-1 break-words">
                        {s.place || s.activity ? (
                          <>
                            {s.place && <span className="font-medium">{s.place}</span>}
                            {s.place && s.activity && " · "}
                            {s.activity}
                          </>
                        ) : (
                          <span className="text-slate-400">비어 있음 (눌러서 채우기)</span>
                        )}
                        {s.memo && <span className="block text-xs text-slate-500">{s.memo}</span>}
                      </span>
                      {s.needsBooking && (
                        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                          예약
                        </span>
                      )}
                      {s.cost > 0 && <span className="shrink-0 text-slate-500">{won(s.cost)}</span>}
                    </button>
                    {open && (
                      <ScheduleForm
                        trip={trip}
                        initial={s}
                        onSave={save}
                        onCancel={() => setEditing(null)}
                        onDelete={() => remove(s.id)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>

            {editing?.kind === "new" && editing.date === date ? (
              <ScheduleForm
                trip={trip}
                initial={emptyItem(date)}
                onSave={save}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing({ kind: "new", date })}
                className="px-2 text-sm font-medium text-sky-700 hover:underline"
              >
                + 일정 추가
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** 새 일정의 빈 값. id는 저장할 때 만든다 */
const emptyItem = (date: string): ScheduleItem => ({
  id: "",
  date,
  slot: "evening", // 시간을 비워 두면 그날 맨 뒤(저녁)에 붙는다
  time: "",
  place: "",
  activity: "",
  cost: 0,
  needsBooking: false,
  memo: "",
});

function ScheduleForm({
  trip,
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  trip: Trip;
  initial: ScheduleItem;
  onSave: (item: ScheduleItem) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  // 비용은 빈칸을 허용하려고 문자열로 들고 있다가 저장 때 숫자로 바꾼다
  const [form, setForm] = useState({ ...initial, cost: initial.cost ? String(initial.cost) : "" });
  const [error, setError] = useState("");
  const idp = `schedule-${initial.id || `new-${initial.date}`}`; // 입력 칸 id가 겹치지 않게

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "place") setError("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); // required/min/max 검사는 브라우저가 이미 통과시킨 상태
    const place = form.place.trim();
    if (!place) return setError("장소를 입력해 주세요.");

    // 시간을 넣으면 시간대(오전/오후/저녁)를 시간에 맞춘다
    const slot: Slot = form.time ? slotFromTime(form.time) : initial.slot;
    onSave({
      ...form,
      slot,
      place,
      activity: form.activity.trim(),
      memo: form.memo.trim(),
      cost: Number(form.cost) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`mt-1 ${card}`} aria-label={onDelete ? "일정 수정" : "일정 추가"}>
      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className={fieldLabel}>날짜</span>
          <input
            type="date"
            className={input}
            required
            min={trip.startDate}
            max={trip.endDate}
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className={fieldLabel}>시간 (선택)</span>
          <input
            type="time"
            className={input}
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
          />
        </label>
      </div>
      <div className="space-y-1">
        <label className="block space-y-1">
          <span className={fieldLabel}>장소</span>
          <input
            type="text"
            className={input}
            required
            maxLength={50}
            placeholder="예: 해운대 해수욕장"
            value={form.place}
            onChange={(e) => set("place", e.target.value)}
            aria-invalid={!!error}
            aria-describedby={`${idp}-place-error`}
          />
        </label>
        <FieldError id={`${idp}-place-error`} message={error} />
      </div>
      <label className="block space-y-1">
        <span className={fieldLabel}>할 일 (선택)</span>
        <input
          type="text"
          className={input}
          maxLength={100}
          placeholder="예: 바다 산책, 점심"
          value={form.activity}
          onChange={(e) => set("activity", e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className={fieldLabel}>예상 비용 (원, 선택)</span>
        <input
          type="number"
          inputMode="numeric"
          className={input}
          min={0}
          step={1}
          placeholder="0"
          value={form.cost}
          onChange={(e) => set("cost", e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.needsBooking}
          onChange={(e) => set("needsBooking", e.target.checked)}
        />
        예약 필요 <span className="text-xs text-slate-500">(할 일에 &quot;예약하기&quot; 자동 추가)</span>
      </label>
      <label className="block space-y-1">
        <span className={fieldLabel}>메모 (선택)</span>
        <textarea
          className={input}
          rows={2}
          maxLength={300}
          value={form.memo}
          onChange={(e) => set("memo", e.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={`flex-1 ${primaryButton}`}>
          저장
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          취소
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg px-3 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            삭제
          </button>
        )}
      </div>
    </form>
  );
}
