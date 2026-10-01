"use client";

// F-08 확정 (방장만): 날짜·출발/귀가 시간·여행지·1인 예산·참여 인원. 기본값은 조율 추천값.
// 확정하면 generate.ts 로 계획 뼈대를 만들어 confirm_trip() 한 번으로 저장하고 준비 단계로 넘어간다.

import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { useRoomContext } from "@/components/room/RoomContext";
import { card, choice, fieldLabel, h2, input, muted, primaryButton } from "@/components/styles";
import { budgetTooHigh, type Coordination } from "@/lib/coordinate";
import { addDays, diffDays, todayISO } from "@/lib/date";
import { confirmTrip } from "@/lib/db";
import { generatePlan } from "@/lib/generate";
import { useValidation } from "@/lib/validation";
import { LABELS } from "@/types/trip";

export default function ConfirmForm({ c }: { c: Coordination }) {
  const { data, supabase, run } = useRoomContext();
  const { trip } = data;
  const v = useValidation("confirm");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    startDate: c.suggested.startDate < todayISO() ? todayISO() : c.suggested.startDate,
    endDate: c.suggested.endDate < todayISO() ? todayISO() : c.suggested.endDate,
    departTime: "",
    returnTime: "",
    destination: c.suggested.destination,
    budget: c.suggested.budget,
    going: new Set(c.suggested.going),
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((p) => ({ ...p, [key]: value }));
  const toggleGoing = (id: string) => {
    const next = new Set(form.going);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set("going", next);
    v.setError("going", undefined);
  };

  const dayTrip = form.startDate !== "" && form.startDate === form.endDate;
  const warn = budgetTooHigh(form.budget, c.budget.min);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const extra = {
      going: form.going.size === 0 ? "참여 인원을 1명 이상 골라 주세요." : undefined,
      returnTime:
        dayTrip && form.departTime && form.returnTime && form.returnTime <= form.departTime
          ? "당일치기는 귀가 시간이 출발 시간보다 늦어야 해요."
          : undefined,
    };
    if (!v.validate(e.currentTarget, extra)) return;
    if (!confirm(`${form.destination.trim()} · ${form.startDate} ~ ${form.endDate}로 확정할까요?\n확정하면 응답을 더 받지 않고 계획이 만들어져요.`)) return;

    const going = [...form.going];
    const plan = generatePlan({
      region: trip.region,
      startDate: form.startDate,
      endDate: form.endDate,
      departTime: form.departTime,
      returnTime: form.returnTime,
      budgetPerPerson: form.budget,
      people: going.length,
      styles: c.suggested.styles,
    });
    setPending(true);
    await run(() =>
      confirmTrip(supabase, trip.id, {
        start_date: form.startDate,
        end_date: form.endDate,
        depart_time: form.departTime,
        return_time: form.returnTime,
        destination: form.destination.trim(),
        budget_per_person: form.budget,
        styles: c.suggested.styles,
        going,
        todos: plan.todos,
        slots: plan.slots,
        budget: plan.budget,
        // 공용 준비물은 한 개, 개인 준비물은 참여자마다 하나씩
        packing: plan.packing.flatMap((p): (typeof p & { owner_id: string | null })[] =>
          p.shared ? [{ ...p, owner_id: null }] : going.map((owner_id) => ({ ...p, owner_id })),
        ),
      }),
    );
    setPending(false);
  };

  return (
    <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className={card} aria-labelledby="confirm-title">
      <div className="space-y-1">
        <h2 id="confirm-title" className={h2}>여행 확정하기</h2>
        <p className={muted}>조율 결과로 추천값을 채워 뒀어요. 확정하면 할 일·일정·예산·준비물이 자동으로 만들어져요.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>출발일</span>
            <input {...v.field("startDate")} type="date" className={input} required min={todayISO()} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </label>
          <FieldError id={v.errorId("startDate")} message={v.errors.startDate} />
        </div>
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>도착일</span>
            <input
              {...v.field("endDate")}
              type="date"
              className={input}
              required
              min={form.startDate || todayISO()}
              max={form.startDate ? addDays(form.startDate, 30) : undefined}
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </label>
          <FieldError id={v.errorId("endDate")} message={v.errors.endDate} />
        </div>
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>출발 시간 (선택)</span>
            <input {...v.field("departTime")} type="time" className={input} value={form.departTime} onChange={(e) => set("departTime", e.target.value)} />
          </label>
          <FieldError id={v.errorId("departTime")} message={v.errors.departTime} />
        </div>
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>귀가 시간 (선택)</span>
            <input {...v.field("returnTime")} type="time" className={input} value={form.returnTime} onChange={(e) => set("returnTime", e.target.value)} />
          </label>
          <FieldError id={v.errorId("returnTime")} message={v.errors.returnTime} />
        </div>
      </div>
      {form.startDate && form.endDate && form.endDate >= form.startDate && (
        <p className={muted}>{dayTrip ? "당일치기" : `${diffDays(form.startDate, form.endDate)}박 ${diffDays(form.startDate, form.endDate) + 1}일`} · 시간을 비우면 첫날 오전 출발, 마지막 날 저녁 귀가로 잡아요.</p>
      )}

      <div className="space-y-1">
        <label className="block space-y-1">
          <span className={fieldLabel}>여행지</span>
          <input {...v.field("destination")} className={input} required maxLength={30} list="destination-options" value={form.destination} onChange={(e) => set("destination", e.target.value)} />
        </label>
        <datalist id="destination-options">
          {c.destinations.map((d) => (
            <option key={d.option.id} value={d.option.name} />
          ))}
        </datalist>
        <FieldError id={v.errorId("destination")} message={v.errors.destination} />
      </div>

      <div className="space-y-1">
        <label className="block space-y-1">
          <span className={fieldLabel}>1인 예산 (원)</span>
          <input
            {...v.field("budget")}
            type="number"
            inputMode="numeric"
            className={input}
            required
            min={50000}
            step={10000}
            value={form.budget || ""}
            onChange={(e) => set("budget", Number(e.target.value))}
          />
        </label>
        <FieldError id={v.errorId("budget")} message={v.errors.budget} />
        {warn && (
          <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
            예산이 부담스러운 참여자가 있어요. (가장 낮은 희망 예산 {c.budget.min.toLocaleString("ko-KR")}원보다 30% 이상 높아요)
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className={`mb-2 ${fieldLabel}`}>참여 인원 ({form.going.size}명)</legend>
        <div className="grid grid-cols-2 gap-2">
          {data.members.map((m) => (
            <label key={m.user_id} className={choice}>
              <input type="checkbox" name="going" checked={form.going.has(m.user_id)} onChange={() => toggleGoing(m.user_id)} aria-describedby={v.errorId("going")} />
              <span className="min-w-0">
                {m.display_name}
                {!c.responders.includes(m.user_id) && <span className="block text-xs text-slate-500">응답 안 함</span>}
              </span>
            </label>
          ))}
        </div>
        <FieldError id={v.errorId("going")} message={v.errors.going} />
      </fieldset>

      <p className={muted}>계획에 반영할 스타일: {c.suggested.styles.map((s) => LABELS.style[s]).join(", ")}</p>

      <button type="submit" disabled={pending} className={`w-full ${primaryButton} py-3 text-base`}>
        {pending ? "계획 만드는 중…" : "확정하고 계획 만들기"}
      </button>
    </form>
  );
}
