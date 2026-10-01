"use client";

// F-06 예산 관리: 예산·실제 지출을 추가·삭제하고, 카테고리별 비교와 총액·1인당 금액을 보여준다

import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { card, choice, deleteButton, fieldLabel, input, primaryButton } from "@/components/styles";
import { summarizeBudget } from "@/lib/budget";
import { BUDGET_CATEGORIES, sortBudget } from "@/lib/sort";
import { LABELS, type BudgetCategory, type BudgetItem, type Trip } from "@/types/trip";

type Props = { trip: Trip; update: (next: Trip) => void };
type Kind = BudgetItem["kind"];

// 금액은 빈칸을 허용하려고 문자열로 들고 있다가 제출 때 숫자로 바꾼다
const EMPTY_FORM = { title: "", category: "" as BudgetCategory | "", amount: "", kind: "actual" as Kind };
type Form = typeof EMPTY_FORM;

const KIND_LABEL: Record<Kind, string> = { plan: "예산", actual: "실제 지출" };
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function BudgetTab({ trip, update }: Props) {
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [error, setError] = useState("");
  const summary = summarizeBudget(trip);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "title") setError("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); // required/min 검사는 브라우저가 이미 통과시킨 상태
    const title = form.title.trim();
    if (!title) return setError("항목 이름을 입력해 주세요.");
    if (!form.category) return;

    const item: BudgetItem = {
      id: crypto.randomUUID(),
      title,
      category: form.category,
      amount: Number(form.amount),
      kind: form.kind,
    };
    update({ ...trip, budget: [...trip.budget, item] });
    setForm({ ...EMPTY_FORM, kind: form.kind });
  };

  const remove = (id: string) => update({ ...trip, budget: trip.budget.filter((b) => b.id !== id) });

  return (
    <section className="space-y-6">
      {/* 총액과 1인당 금액 */}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="총예산" value={won(summary.plan)} sub={`1인 ${won(summary.planPerPerson)}`} />
        <Stat
          label="실제 지출"
          value={won(summary.actual)}
          sub={`1인 ${won(summary.actualPerPerson)}`}
          warn={summary.actual > summary.plan}
        />
      </div>
      <p className="text-sm text-slate-500">
        {summary.actual > summary.plan
          ? `예산보다 ${won(summary.actual - summary.plan)} 더 썼어요.`
          : `남은 예산 ${won(summary.plan - summary.actual)} (${trip.people}명 기준)`}
      </p>

      {/* 카테고리별 예산 대비 실제 지출 */}
      <div className="space-y-3">
        <h3 className="font-semibold">카테고리별 예산 대비 지출</h3>
        {summary.byCategory.map(({ category, plan, actual }) => {
          const over = actual > plan;
          const ratio = plan > 0 ? Math.min(actual / plan, 1) : actual > 0 ? 1 : 0;
          return (
            <div key={category} className="space-y-1">
              <div className="flex flex-wrap justify-between gap-x-2 text-sm">
                <span className="font-medium">{LABELS.budgetCategory[category]}</span>
                <span className={over ? "text-red-600" : "text-slate-500"}>
                  {won(actual)} / {won(plan)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden>
                <div
                  className={`h-full rounded-full ${over ? "bg-red-500" : "bg-sky-700"}`}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className={card} aria-label="예산·지출 추가">
        <fieldset className="space-y-1">
          <legend className={`mb-1 ${fieldLabel}`}>구분</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
              <label key={k} className={choice}>
                <input
                  type="radio"
                  name="budget-kind"
                  value={k}
                  required
                  checked={form.kind === k}
                  onChange={() => set("kind", k)}
                />
                {KIND_LABEL[k]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>항목</span>
            <input
              type="text"
              className={input}
              required
              maxLength={30}
              placeholder="예: KTX 왕복"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              aria-invalid={!!error}
              aria-describedby="budget-title-error"
            />
          </label>
          <FieldError id="budget-title-error" message={error} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className={fieldLabel}>카테고리</span>
            <select
              className={input}
              required
              value={form.category}
              onChange={(e) => set("category", e.target.value as BudgetCategory)}
            >
              <option value="" disabled>
                선택
              </option>
              {BUDGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {LABELS.budgetCategory[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={fieldLabel}>금액 (원)</span>
            <input
              type="number"
              inputMode="numeric"
              className={input}
              required
              min={1}
              step={1}
              placeholder="0"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          </label>
        </div>
        <button type="submit" className={`w-full ${primaryButton}`}>
          {KIND_LABEL[form.kind]} 추가
        </button>
      </form>

      {/* 항목 목록 */}
      <div className="space-y-2">
        <h3 className="font-semibold">전체 항목</h3>
        {trip.budget.length === 0 && <p className="text-slate-500">항목이 없어요.</p>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {sortBudget(trip.budget).map((b) => (
            <li key={b.id} className="flex items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1 break-words">
                <span className="text-slate-500">{LABELS.budgetCategory[b.category]} · </span>
                {b.title}
                <span
                  className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                    b.kind === "plan"
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {KIND_LABEL[b.kind]}
                </span>
              </span>
              <span className="shrink-0">{won(b.amount)}</span>
              <button
                type="button"
                onClick={() => remove(b.id)}
                className={deleteButton}
                aria-label={`${b.title} ${KIND_LABEL[b.kind]} 삭제`}
              >
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
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold break-all ${warn ? "text-red-600" : ""}`}>{value}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}
