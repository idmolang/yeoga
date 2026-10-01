// F-09 계획 자동 생성: 확정값 → 할 일·일정 틀·예산·준비물 (FRD 9장)
// 규칙은 src/data/rules.json 에 있다. 항목을 늘리려면 JSON만 고치면 된다. (v0.1 규칙 그대로 재사용)

import rules from "@/data/rules.json";
import { addDays, diffDays, todayISO } from "@/lib/date";
import { buildSchedule } from "@/lib/schedule";
import type { PackingCategory } from "@/types/db";
import type { BudgetCategory, Region, Slot, Style } from "@/types/trip";

/** 방장이 확정한 값 */
export interface PlanInput {
  region: Region;
  startDate: string;
  endDate: string;
  departTime: string; // "" 이면 미입력
  returnTime: string;
  budgetPerPerson: number;
  people: number;
  styles: Style[];
}

export interface PlanTodo { title: string; due_date: string; urgent: boolean }
export interface PlanSlot { date: string; slot: Slot; time: string; activity: string; marker: "depart" | "return" | null }
export interface PlanBudget { title: string; category: BudgetCategory; amount: number }
export interface PlanPacking { name: string; category: PackingCategory; shared: boolean }

const nights = (a: PlanInput) => diffDays(a.startDate, a.endDate);

/** rules.json 의 "when" 조건을 확정값에 대입해 본다 */
function matches(when: string, a: PlanInput): boolean {
  if (when === "always") return true;
  if (when === "overseas" || when === "domestic") return a.region === when;
  if (when.startsWith("style:")) return a.styles.includes(when.slice(6) as Style);
  if (when.startsWith("nights>=")) return nights(a) >= Number(when.slice(8));
  return false;
}

/** 출발 N일 전 마감. 이미 지났으면 마감을 "오늘"로 하고 급함 표시 */
export function deadline(startDate: string, daysBefore: number) {
  const today = todayISO();
  const due = addDays(startDate, -daysBefore);
  const late = diffDays(today, due) < 0;
  return { due_date: late ? today : due, urgent: late };
}

/** 일정에서 "예약 필요"를 체크하면 추가되는 할 일 (마감 D-7) */
export const BOOKING_DAYS_BEFORE = 7;
export const bookingTodoTitle = (place: string) => `${place} 예약하기`;

function makeTodos(a: PlanInput): PlanTodo[] {
  return rules.todos
    .filter((r) => matches(r.when, a))
    .map((r) => ({ title: r.title, ...deadline(a.startDate, r.daysBefore) }))
    .sort((x, y) => x.due_date.localeCompare(y.due_date));
}

/** 출발·귀가 시간을 반영한 일정 틀 (규칙은 lib/schedule.ts) */
function makeSchedule(a: PlanInput): PlanSlot[] {
  return buildSchedule({ startDate: a.startDate, endDate: a.endDate, departTime: a.departTime, returnTime: a.returnTime });
}

function makeBudget(a: PlanInput): PlanBudget[] {
  const total = a.budgetPerPerson * a.people;
  const ratio = rules.budgetRatio[a.region];
  return Object.entries(ratio).map(([category, r]) => ({
    title: "기본 배분",
    category: category as BudgetCategory,
    amount: Math.round((total * r) / 1000) * 1000,
  }));
}

function makePacking(a: PlanInput): PlanPacking[] {
  const seen = new Set<string>();
  const result: PlanPacking[] = [];
  for (const rule of rules.packing.filter((r) => matches(r.when, a))) {
    for (const name of rule.items) {
      if (seen.has(name)) continue;
      seen.add(name);
      // 멀티어댑터처럼 하나만 있으면 되는 항목은 공용, 나머지는 각자 챙기는 개인 준비물
      result.push({ name, category: rule.group as PackingCategory, shared: rules.sharedPacking.includes(name) });
    }
  }
  return result;
}

export function generatePlan(a: PlanInput) {
  return {
    todos: makeTodos(a),
    slots: makeSchedule(a),
    budget: makeBudget(a),
    packing: makePacking(a),
  };
}
