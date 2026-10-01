// F-03 뼈대 자동 생성: 빠른 시작 응답 → 할 일·일정 틀·예산·준비물
// 규칙은 src/data/rules.json 에 있다. 항목을 늘리려면 JSON만 고치면 된다.

import rules from "@/data/rules.json";
import { addDays, dateRange, diffDays, todayISO } from "@/lib/date";
import type {
  BudgetCategory,
  BudgetItem,
  PackingItem,
  QuickStartAnswers,
  ScheduleItem,
  Slot,
  Style,
  Todo,
  Trip,
} from "@/types/trip";

const uid = () => crypto.randomUUID();

const nights = (a: QuickStartAnswers) => diffDays(a.startDate, a.endDate);

/** rules.json 의 "when" 조건을 응답에 대입해 본다 */
function matches(when: string, a: QuickStartAnswers): boolean {
  if (when === "always") return true;
  if (when === "overseas" || when === "domestic") return a.region === when;
  if (when.startsWith("style:")) return a.styles.includes(when.slice(6) as Style);
  if (when.startsWith("nights>=")) return nights(a) >= Number(when.slice(8));
  return false;
}

function makeTodos(a: QuickStartAnswers): Todo[] {
  const today = todayISO();
  return rules.todos
    .filter((r) => matches(r.when, a))
    .map((r) => {
      const due = addDays(a.startDate, -r.daysBefore);
      const late = diffDays(today, due) < 0; // 마감이 이미 지났으면 "오늘"로 + 급함
      return {
        id: uid(),
        title: r.title,
        dueDate: late ? today : due,
        assignee: "",
        done: false,
        urgent: late,
      };
    })
    .sort((x, y) => x.dueDate.localeCompare(y.dueDate));
}

function makeSchedule(a: QuickStartAnswers): ScheduleItem[] {
  const days = dateRange(a.startDate, a.endDate);
  const slots: Slot[] = ["morning", "afternoon", "evening"];

  return days.flatMap((date, i) =>
    slots.map((slot) => {
      let activity = "";
      if (i === 0 && slot === "morning") activity = "출발·이동";
      if (i === days.length - 1 && slot === "evening") activity = "귀가";
      return {
        id: uid(),
        date,
        slot,
        time: "",
        place: "",
        activity,
        cost: 0,
        needsBooking: false,
        memo: "",
      };
    }),
  );
}

function makeBudget(a: QuickStartAnswers): BudgetItem[] {
  const total = a.budgetPerPerson * a.people;
  const ratio = rules.budgetRatio[a.region];
  return Object.entries(ratio).map(([category, r]) => ({
    id: uid(),
    title: "기본 배분",
    category: category as BudgetCategory,
    amount: Math.round((total * r) / 1000) * 1000,
    kind: "plan" as const,
  }));
}

function makePacking(a: QuickStartAnswers): PackingItem[] {
  const seen = new Set<string>();
  const result: PackingItem[] = [];
  for (const rule of rules.packing.filter((r) => matches(r.when, a))) {
    for (const name of rule.items) {
      if (seen.has(name)) continue;
      seen.add(name);
      result.push({ id: uid(), name, group: rule.group, packed: false });
    }
  }
  return result;
}

export function createTrip(a: QuickStartAnswers): Trip {
  const now = new Date().toISOString();
  return {
    ...a,
    id: uid(),
    name: a.name.trim() || `${a.destination} 여행`,
    todos: makeTodos(a),
    schedule: makeSchedule(a),
    budget: makeBudget(a),
    packing: makePacking(a),
    createdAt: now,
    updatedAt: now,
  };
}
