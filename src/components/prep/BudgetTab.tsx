"use client";

// F-12 예산·지출: 예산과 실제 지출을 추가·삭제하고, 실제 지출에는 결제한 사람·함께 쓴 사람을 기록한다.
// 카테고리별 예산 대비 실제 지출, 총액·1인당 금액을 보여준다. (v0.1 BudgetTab을 DB 버전으로)

import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { useRoomContext } from "@/components/room/RoomContext";
import { badge, badgeTone, card, choice, deleteButton, fieldLabel, h3, input, muted, primaryButton } from "@/components/styles";
import { summarizeBudget } from "@/lib/budget";
import { deleteRow, insertRow } from "@/lib/db";
import { BUDGET_CATEGORIES, sortExpenses } from "@/lib/sort";
import { useValidation } from "@/lib/validation";
import type { ExpenseRow } from "@/types/db";
import { LABELS, type BudgetCategory } from "@/types/trip";

type Kind = ExpenseRow["kind"];
const KIND_LABEL: Record<Kind, string> = { plan: "예산", actual: "실제 지출" };
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function BudgetTab() {
  const { data, supabase, run, going, me, nameOf } = useRoomContext();
  const { trip, expenses } = data;
  const v = useValidation("expense");
  const everyone = going.map((m) => m.user_id);
  const empty = () => ({
    title: "",
    category: "" as BudgetCategory | "",
    amount: "",
    kind: "actual" as Kind,
    paidBy: everyone.includes(me) ? me : "",
    sharedWith: new Set(everyone), // 함께 쓴 사람 기본값: 참여 인원 전원
  });
  const [form, setForm] = useState(empty);
  const summary = summarizeBudget(expenses, going.length);
  const set = <K extends keyof ReturnType<typeof empty>>(key: K, value: ReturnType<typeof empty>[K]) => setForm((p) => ({ ...p, [key]: value }));
  const toggleShare = (id: string) => {
    const next = new Set(form.sharedWith);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set("sharedWith", next);
    v.setError("sharedWith", undefined);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const actual = form.kind === "actual";
    if (!v.validate(e.currentTarget, { sharedWith: actual && form.sharedWith.size === 0 ? "함께 쓴 사람을 1명 이상 골라 주세요." : undefined })) return;
    const ok = await run(() =>
      insertRow(supabase, "expenses", {
        trip_id: trip.id,
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        kind: form.kind,
        paid_by: actual ? form.paidBy : null,
        shared_with: actual ? [...form.sharedWith] : [],
      }),
    );
    if (ok) setForm({ ...empty(), kind: form.kind });
  };

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="총예산" value={won(summary.plan)} sub={`1인 ${won(summary.planPerPerson)}`} />
        <Stat label="실제 지출" value={won(summary.actual)} sub={`1인 ${won(summary.actualPerPerson)}`} warn={summary.actual > summary.plan} />
      </div>
      <p className={muted}>
        {summary.actual > summary.plan
          ? `예산보다 ${won(summary.actual - summary.plan)} 더 썼어요.`
          : `남은 예산 ${won(summary.plan - summary.actual)} (${going.length}명 기준)`}
      </p>

      <div className="space-y-3">
        <h3 className={h3}>카테고리별 예산 대비 지출</h3>
        {summary.byCategory.map(({ category, plan, actual }) => {
          const over = actual > plan;
          const ratio = plan > 0 ? Math.min(actual / plan, 1) : actual > 0 ? 1 : 0;
          return (
            <div key={category} className="space-y-1">
              <div className="flex flex-wrap justify-between gap-x-2 text-sm">
                <span className="font-medium">{LABELS.budgetCategory[category]}</span>
                <span className={over ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}>
                  {won(actual)} / {won(plan)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden>
                <div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-sky-600"}`} style={{ width: `${ratio * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className={card} aria-label="예산·지출 추가">
        <fieldset>
          <legend className={`mb-2 ${fieldLabel}`}>구분</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
              <label key={k} className={choice}>
                <input type="radio" name="kind" required checked={form.kind === k} onChange={() => set("kind", k)} />
                {KIND_LABEL[k]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>항목</span>
            <input {...v.field("title")} className={input} required maxLength={30} placeholder="예: KTX 왕복" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <FieldError id={v.errorId("title")} message={v.errors.title} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block space-y-1">
              <span className={fieldLabel}>카테고리</span>
              <select {...v.field("category")} className={input} required value={form.category} onChange={(e) => set("category", e.target.value as BudgetCategory)}>
                <option value="" disabled>선택</option>
                {BUDGET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{LABELS.budgetCategory[c]}</option>
                ))}
              </select>
            </label>
            <FieldError id={v.errorId("category")} message={v.errors.category} />
          </div>
          <div className="space-y-1">
            <label className="block space-y-1">
              <span className={fieldLabel}>금액 (원)</span>
              <input {...v.field("amount")} type="number" inputMode="numeric" className={input} required min={1} step={1} placeholder="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </label>
            <FieldError id={v.errorId("amount")} message={v.errors.amount} />
          </div>
        </div>

        {form.kind === "actual" && (
          <>
            <div className="space-y-1">
              <label className="block space-y-1">
                <span className={fieldLabel}>결제한 사람</span>
                <select {...v.field("paidBy")} className={input} required value={form.paidBy} onChange={(e) => set("paidBy", e.target.value)}>
                  <option value="" disabled>선택</option>
                  {going.map((m) => (
                    <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                  ))}
                </select>
              </label>
              <FieldError id={v.errorId("paidBy")} message={v.errors.paidBy} />
            </div>
            <fieldset className="space-y-2">
              <legend className={`mb-2 ${fieldLabel}`}>함께 쓴 사람 ({form.sharedWith.size}명이 나눠 내요)</legend>
              <div className="grid grid-cols-2 gap-2">
                {going.map((m) => (
                  <label key={m.user_id} className={choice}>
                    <input type="checkbox" name="sharedWith" checked={form.sharedWith.has(m.user_id)} onChange={() => toggleShare(m.user_id)} aria-describedby={v.errorId("sharedWith")} />
                    {m.display_name}
                  </label>
                ))}
              </div>
              <FieldError id={v.errorId("sharedWith")} message={v.errors.sharedWith} />
            </fieldset>
          </>
        )}
        <button type="submit" className={`w-full ${primaryButton}`}>{KIND_LABEL[form.kind]} 추가</button>
      </form>

      <div className="space-y-2">
        <h3 className={h3}>전체 항목</h3>
        {expenses.length === 0 && <p className={muted}>항목이 없어요.</p>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {sortExpenses(expenses).map((b) => (
            <li key={b.id} className="flex items-start gap-2 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="text-slate-500 dark:text-slate-400">{LABELS.budgetCategory[b.category]} · </span>
                {b.title}
                <span className={`ml-2 ${badge} ${b.kind === "plan" ? badgeTone.gray : badgeTone.amber}`}>{KIND_LABEL[b.kind]}</span>
                {b.kind === "actual" && (
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {nameOf(b.paid_by)} 결제 · {b.shared_with.length === going.length ? "전원" : b.shared_with.map(nameOf).join(", ")} 함께
                  </span>
                )}
              </span>
              <span className="shrink-0 font-medium">{won(b.amount)}</span>
              <button type="button" onClick={() => run(() => deleteRow(supabase, "expenses", b.id))} className={deleteButton} aria-label={`${b.title} ${KIND_LABEL[b.kind]} 삭제`}>
                삭제
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${warn ? "text-red-600 dark:text-red-400" : ""}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}
