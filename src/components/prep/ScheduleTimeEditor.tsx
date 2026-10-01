"use client";

// 확정 후 출발·귀가 시간 바꾸기 (방장만)
// 첫날·마지막 날 슬롯을 다시 배치하고, 내용이 있는 슬롯이 사라지면 먼저 확인을 받는다.

import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { useRoomContext } from "@/components/room/RoomContext";
import { card, fieldLabel, ghostButton, input, muted, primaryButton, secondaryButton } from "@/components/styles";
import { deleteRow, insertRows, updateRow, updateTrip } from "@/lib/db";
import { relayout } from "@/lib/schedule";
import { useValidation } from "@/lib/validation";
import { LABELS } from "@/types/trip";

export default function ScheduleTimeEditor() {
  const { data, isHost, supabase, run } = useRoomContext();
  const { trip, slots } = data;
  const v = useValidation("times");
  const [open, setOpen] = useState(false);
  const [depart, setDepart] = useState(trip.depart_time ?? "");
  const [back, setBack] = useState(trip.return_time ?? "");
  const dayTrip = trip.start_date === trip.end_date;

  const summary = `출발 ${trip.depart_time ?? "시간 미정(오전)"} · 귀가 ${trip.return_time ?? "시간 미정(저녁)"}`;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const invalid = dayTrip && depart && back && back <= depart;
    if (!v.validate(e.currentTarget, { returnTime: invalid ? "당일치기는 귀가 시간이 출발 시간보다 늦어야 해요." : undefined })) return;

    const plan = relayout(slots, { startDate: trip.start_date!, endDate: trip.end_date!, departTime: depart, returnTime: back });
    if (plan.lost.length > 0) {
      const list = plan.lost.map((s) => `· ${s.date} ${LABELS.slot[s.slot]} ${s.place || s.activity || s.memo}`).join("\n");
      if (!confirm(`시간을 바꾸면 아래 일정이 사라져요. 계속할까요?\n${list}`)) return;
    }
    const ok = await run(async () => {
      await updateTrip(supabase, trip.id, { depart_time: depart || null, return_time: back || null });
      for (const s of plan.deletes) await deleteRow(supabase, "schedule_slots", s.id);
      for (const u of plan.updates) await updateRow(supabase, "schedule_slots", u.id, u.patch);
      await insertRows(supabase, "schedule_slots", plan.inserts.map((s) => ({ ...s, trip_id: trip.id })));
    });
    if (ok) setOpen(false);
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={muted}>{summary}</p>
        {isHost && (
          <button type="button" className={ghostButton} onClick={() => { setDepart(trip.depart_time ?? ""); setBack(trip.return_time ?? ""); setOpen(true); }}>
            시간 바꾸기
          </button>
        )}
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className={card} aria-label="출발·귀가 시간 바꾸기">
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className={fieldLabel}>출발 시간</span>
          <input type="time" name="departTime" className={input} value={depart} onChange={(e) => setDepart(e.target.value)} />
        </label>
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>귀가 시간</span>
            <input {...v.field("returnTime")} type="time" className={input} value={back} onChange={(e) => setBack(e.target.value)} />
          </label>
          <FieldError id={v.errorId("returnTime")} message={v.errors.returnTime} />
        </div>
      </div>
      <p className={muted}>비우면 첫날 오전 출발, 마지막 날 저녁 귀가로 잡아요. 출발 전·귀가 후 슬롯은 정리돼요.</p>
      <div className="flex gap-2">
        <button type="submit" className={`flex-1 ${primaryButton}`}>바꾸기</button>
        <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>취소</button>
      </div>
    </form>
  );
}
