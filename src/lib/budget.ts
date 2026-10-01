// F-06 예산 계산: 화면과 엑셀이 같은 합계를 쓰도록 한곳에서 계산한다

import { BUDGET_CATEGORIES } from "@/lib/sort";
import type { BudgetItem, Trip } from "@/types/trip";

const sum = (items: BudgetItem[]) => items.reduce((total, b) => total + b.amount, 0);

export function summarizeBudget(trip: Trip) {
  const plans = trip.budget.filter((b) => b.kind === "plan");
  const actuals = trip.budget.filter((b) => b.kind === "actual");
  const people = Math.max(trip.people, 1);

  const plan = sum(plans);
  const actual = sum(actuals);

  return {
    plan,
    actual,
    planPerPerson: Math.round(plan / people),
    actualPerPerson: Math.round(actual / people),
    /** 카테고리별 예산 대비 실제 지출 */
    byCategory: BUDGET_CATEGORIES.map((category) => ({
      category,
      plan: sum(plans.filter((b) => b.category === category)),
      actual: sum(actuals.filter((b) => b.category === category)),
    })),
  };
}
