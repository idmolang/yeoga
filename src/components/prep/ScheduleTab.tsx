"use client";

// F-11 일정: 날짜·시간순으로 보여주고, 슬롯을 눌러 수정하거나 새 일정을 추가·삭제한다. (v0.1 ScheduleTab을 DB 버전으로)
// 슬롯마다 좋아요와 의견을 남길 수 있다.
// "예약 필요"를 체크해 저장하면 할 일 목록에 "{장소} 예약하기"를 추가한다 (같은 제목이 있으면 건너뜀).

import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import BookingLinks from "@/components/prep/BookingLinks";
import ScheduleTimeEditor from "@/components/prep/ScheduleTimeEditor";
import { useRoomContext } from "@/components/room/RoomContext";
import { badge, badgeTone, card, deleteButton, fieldLabel, input, muted, primaryButton, secondaryButton, dangerButton } from "@/components/styles";
import { dateRange, formatKDate } from "@/lib/date";
import { deleteRow, deleteWhere, insertRow, updateRow } from "@/lib/db";
import { BOOKING_DAYS_BEFORE, bookingTodoTitle, deadline } from "@/lib/generate";
import { slotFromTime, slotHasContent } from "@/lib/schedule";
import { sortSlots } from "@/lib/sort";
import { useValidation } from "@/lib/validation";
import type { SlotRow } from "@/types/db";
import { LABELS } from "@/types/trip";

/** 수정 중인 슬롯 id, 또는 새 일정을 추가할 날짜 */
type Editing = { kind: "edit"; id: string } | { kind: "new"; date: string } | null;

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function ScheduleTab() {
  const { data, supabase, run, me } = useRoomContext();
  const { trip, slots, likes, comments, todos } = data;
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState("");

  const items = sortSlots(slots);
  // 기간 안의 모든 날짜를 보여준다 (슬롯을 다 지운 날에도 추가할 수 있게)
  const days = [...new Set([...dateRange(trip.start_date!, trip.end_date!), ...items.map((s) => s.date)])].sort();
  const totalCost = items.reduce((sum, s) => sum + s.cost, 0);

  const save = async (values: SlotValues, original: SlotRow | null) => {
    const row = {
      date: values.date,
      // 시간을 넣으면 시간대(오전/오후/저녁)를 시간에 맞춘다
      slot: values.time ? slotFromTime(values.time) : (original?.slot ?? "evening"),
      time: values.time,
      place: values.place.trim(),
      activity: values.activity.trim(),
      cost: Number(values.cost) || 0,
      needs_booking: values.needsBooking,
      memo: values.memo.trim(),
    };
    const title = bookingTodoTitle(row.place);
    const addBooking = row.needs_booking && !todos.some((t) => t.title === title);
    const ok = await run(async () => {
      if (original) await updateRow(supabase, "schedule_slots", original.id, row);
      else await insertRow(supabase, "schedule_slots", { ...row, trip_id: trip.id });
      if (addBooking) {
        await insertRow(supabase, "todos", { trip_id: trip.id, title, ...deadline(trip.start_date!, BOOKING_DAYS_BEFORE) });
      }
    });
    if (ok) {
      setNotice(addBooking ? `할 일 목록에 "${title}"을(를) 추가했어요.` : "");
      setEditing(null);
    }
  };

  const remove = async (s: SlotRow) => {
    if (slotHasContent(s) && !confirm("이 일정을 삭제할까요? 의견과 좋아요도 함께 지워져요.")) return;
    if (await run(() => deleteRow(supabase, "schedule_slots", s.id))) setEditing(null);
  };

  const toggleLike = (s: SlotRow, liked: boolean) =>
    run(() =>
      liked
        ? deleteWhere(supabase, "slot_likes", { slot_id: s.id, user_id: me })
        : insertRow(supabase, "slot_likes", { slot_id: s.id, trip_id: trip.id, user_id: me }),
    );

  return (
    <section className="space-y-6">
      <ScheduleTimeEditor />
      <BookingLinks />
      {totalCost > 0 && <p className={muted}>예상 비용 합계 {won(totalCost)}</p>}
      {notice && (
        <p role="status" className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:bg-sky-950 dark:text-sky-200">
          {notice}
        </p>
      )}

      {days.map((date, i) => {
        const dayItems = items.filter((s) => s.date === date);
        return (
          <div key={date} className="space-y-2">
            <h3 className="font-semibold">
              {i + 1}일차 <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{formatKDate(date)}</span>
            </h3>

            <ul className="space-y-1">
              {dayItems.map((s) => {
                const open = editing?.kind === "edit" && editing.id === s.id;
                const slotLikes = likes.filter((l) => l.slot_id === s.id);
                const liked = slotLikes.some((l) => l.user_id === me);
                const slotComments = comments.filter((c) => c.slot_id === s.id);
                return (
                  <li key={s.id} className="rounded-xl ring-slate-200 has-[form]:ring-1 dark:ring-slate-800">
                    <div className="flex items-start gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(open ? null : { kind: "edit", id: s.id })}
                        aria-expanded={open}
                        className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <span className="w-11 shrink-0 text-slate-500 dark:text-slate-400">{s.time || LABELS.slot[s.slot]}</span>
                        <span className="min-w-0 flex-1">
                          {s.place || s.activity ? (
                            <>
                              {s.place && <span className="font-medium">{s.place}</span>}
                              {s.place && s.activity && " · "}
                              {s.activity}
                            </>
                          ) : (
                            <span className="text-slate-400">비어 있음 (눌러서 채우기)</span>
                          )}
                          {s.memo && <span className="block text-xs text-slate-500 dark:text-slate-400">{s.memo}</span>}
                          <span className="mt-0.5 flex flex-wrap gap-1.5">
                            {s.needs_booking && <span className={`${badge} ${badgeTone.amber}`}>예약</span>}
                            {s.cost > 0 && <span className={`${badge} ${badgeTone.gray}`}>{won(s.cost)}</span>}
                            {slotComments.length > 0 && <span className={`${badge} ${badgeTone.sky}`}>의견 {slotComments.length}</span>}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleLike(s, liked)}
                        aria-pressed={liked}
                        aria-label={`좋아요 ${slotLikes.length}개${liked ? ", 내가 누름" : ""}`}
                        className={`shrink-0 rounded-lg px-2 py-2 text-sm ${liked ? "text-rose-600" : "text-slate-400"} hover:bg-slate-100 dark:hover:bg-slate-800`}
                      >
                        {liked ? "♥" : "♡"} {slotLikes.length}
                      </button>
                    </div>
                    {open && (
                      <div className="space-y-3 p-2">
                        <SlotForm key={s.id} trip={trip} initial={s} onSave={(v) => save(v, s)} onCancel={() => setEditing(null)} onDelete={() => remove(s)} />
                        <Comments slotId={s.id} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {editing?.kind === "new" && editing.date === date ? (
              <SlotForm key={`new-${date}`} trip={trip} initial={null} date={date} onSave={(v) => save(v, null)} onCancel={() => setEditing(null)} />
            ) : (
              <button type="button" onClick={() => setEditing({ kind: "new", date })} className="px-2 text-sm font-medium text-sky-700 hover:underline dark:text-sky-300">
                + 일정 추가
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

interface SlotValues {
  date: string;
  time: string;
  place: string;
  activity: string;
  cost: string;
  needsBooking: boolean;
  memo: string;
}

function SlotForm({
  trip,
  initial,
  date,
  onSave,
  onCancel,
  onDelete,
}: {
  trip: { start_date: string | null; end_date: string | null };
  initial: SlotRow | null;
  date?: string;
  onSave: (v: SlotValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const v = useValidation(`slot-${initial?.id ?? `new-${date}`}`);
  const [form, setForm] = useState<SlotValues>({
    date: initial?.date ?? date ?? trip.start_date!,
    time: initial?.time ?? "",
    place: initial?.place ?? "",
    activity: initial?.activity ?? "",
    cost: initial?.cost ? String(initial.cost) : "",
    needsBooking: initial?.needs_booking ?? false,
    memo: initial?.memo ?? "",
  });
  const [pending, setPending] = useState(false);
  const set = <K extends keyof SlotValues>(key: K, value: SlotValues[K]) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!v.validate(e.currentTarget)) return;
    setPending(true);
    await onSave(form);
    setPending(false);
  };

  return (
    <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className={card} aria-label={initial ? "일정 수정" : "일정 추가"}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>날짜</span>
            <input {...v.field("date")} type="date" className={input} required min={trip.start_date!} max={trip.end_date!} value={form.date} onChange={(e) => set("date", e.target.value)} />
          </label>
          <FieldError id={v.errorId("date")} message={v.errors.date} />
        </div>
        <label className="block space-y-1">
          <span className={fieldLabel}>시간 (선택)</span>
          <input type="time" name="time" className={input} value={form.time} onChange={(e) => set("time", e.target.value)} />
        </label>
      </div>
      <div className="space-y-1">
        <label className="block space-y-1">
          <span className={fieldLabel}>장소</span>
          <input {...v.field("place")} className={input} required maxLength={50} placeholder="예: 해운대 해수욕장" value={form.place} onChange={(e) => set("place", e.target.value)} />
        </label>
        <FieldError id={v.errorId("place")} message={v.errors.place} />
      </div>
      <label className="block space-y-1">
        <span className={fieldLabel}>할 일 (선택)</span>
        <input name="activity" className={input} maxLength={100} placeholder="예: 바다 산책, 점심" value={form.activity} onChange={(e) => set("activity", e.target.value)} />
      </label>
      <div className="space-y-1">
        <label className="block space-y-1">
          <span className={fieldLabel}>예상 비용 (원, 선택)</span>
          <input {...v.field("cost")} type="number" inputMode="numeric" className={input} min={0} step={1} placeholder="0" value={form.cost} onChange={(e) => set("cost", e.target.value)} />
        </label>
        <FieldError id={v.errorId("cost")} message={v.errors.cost} />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="needsBooking" checked={form.needsBooking} onChange={(e) => set("needsBooking", e.target.checked)} />
        예약 필요 <span className="text-xs text-slate-500">(할 일에 &quot;예약하기&quot; 자동 추가)</span>
      </label>
      <label className="block space-y-1">
        <span className={fieldLabel}>메모 (선택)</span>
        <textarea name="memo" className={input} rows={2} maxLength={300} value={form.memo} onChange={(e) => set("memo", e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={`flex-1 ${primaryButton}`}>저장</button>
        <button type="button" onClick={onCancel} className={secondaryButton}>취소</button>
        {onDelete && <button type="button" onClick={onDelete} className={dangerButton}>삭제</button>}
      </div>
    </form>
  );
}

/** 슬롯별 의견 */
function Comments({ slotId }: { slotId: string }) {
  const { data, supabase, run, me, nameOf } = useRoomContext();
  const v = useValidation(`comment-${slotId}`);
  const [body, setBody] = useState("");
  const list = data.comments.filter((c) => c.slot_id === slotId);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!v.validate(e.currentTarget)) return;
    if (await run(() => insertRow(supabase, "slot_comments", { slot_id: slotId, trip_id: data.trip.id, user_id: me, body: body.trim() }))) setBody("");
  };

  return (
    <div className="space-y-2 px-1">
      <p className="text-sm font-semibold">의견 {list.length > 0 && list.length}</p>
      <ul className="space-y-1.5">
        {list.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-sm">
            <span className="min-w-0 flex-1">
              <strong className="mr-1.5">{nameOf(c.user_id)}</strong>
              {c.body}
            </span>
            {c.user_id === me && (
              <button type="button" className={deleteButton} aria-label="내 의견 삭제" onClick={() => run(() => deleteRow(supabase, "slot_comments", c.id))}>
                삭제
              </button>
            )}
          </li>
        ))}
      </ul>
      <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className="space-y-1">
        <div className="flex items-end gap-2">
          <label className="block min-w-0 flex-1 space-y-1">
            <span className="sr-only">의견 내용</span>
            <textarea {...v.field("body")} className={`${input} text-sm`} rows={1} required maxLength={200} placeholder="의견 남기기 (200자)" value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <button type="submit" className={secondaryButton}>등록</button>
        </div>
        <FieldError id={v.errorId("body")} message={v.errors.body} />
      </form>
    </div>
  );
}
