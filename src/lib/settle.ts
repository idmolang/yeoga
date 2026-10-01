// F-13 정산 (FRD 10장): 실제 지출만 대상, 적은 송금 횟수(최대 인원 − 1번)로 맞춘다

import type { ExpenseRow } from "@/types/db";

export interface Balance {
  userId: string;
  paid: number; // 낸 돈
  owed: number; // 써야 할 돈 (부담액)
  diff: number; // 낸 돈 − 부담액 (양수: 받을 사람, 음수: 보낼 사람)
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/** people: 정산에 표시할 사람 순서 (같은 금액일 때 이 순서로 정해서 결과가 항상 같게) */
export function settle(expenses: ExpenseRow[], people: string[]) {
  const ids = [...people];
  const add = (id: string | null) => {
    if (id && !ids.includes(id)) ids.push(id);
  };
  const actual = expenses.filter((e) => e.kind === "actual" && e.paid_by && e.shared_with.length > 0);
  actual.forEach((e) => {
    add(e.paid_by);
    e.shared_with.forEach(add);
  });

  const paid = new Map(ids.map((id) => [id, 0]));
  const owed = new Map(ids.map((id) => [id, 0]));

  for (const e of actual) {
    const payer = e.paid_by!;
    paid.set(payer, paid.get(payer)! + e.amount);
    // 1) 함께 쓴 사람 수로 나누고, 1원 단위 나머지는 결제한 사람이 부담
    const share = Math.floor(e.amount / e.shared_with.length);
    const remainder = e.amount - share * e.shared_with.length;
    for (const u of e.shared_with) owed.set(u, owed.get(u)! + share);
    owed.set(payer, owed.get(payer)! + remainder);
  }

  // 2) 사람마다 차액
  const balances: Balance[] = ids.map((userId) => ({
    userId,
    paid: paid.get(userId)!,
    owed: owed.get(userId)!,
    diff: paid.get(userId)! - owed.get(userId)!,
  }));

  // 3) 가장 많이 보낼 사람 → 가장 많이 받을 사람에게 둘 중 작은 금액, 모두 0이 될 때까지
  const left = new Map(balances.map((b) => [b.userId, b.diff]));
  const transfers: Transfer[] = [];
  const order = (id: string) => ids.indexOf(id);
  for (let guard = 0; guard < ids.length * ids.length; guard++) {
    const entries = [...left.entries()];
    const debtor = entries.filter(([, d]) => d < 0).sort((a, b) => a[1] - b[1] || order(a[0]) - order(b[0]))[0];
    const creditor = entries.filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1] || order(a[0]) - order(b[0]))[0];
    if (!debtor || !creditor) break;
    const amount = Math.min(-debtor[1], creditor[1]);
    transfers.push({ from: debtor[0], to: creditor[0], amount });
    left.set(debtor[0], debtor[1] + amount);
    left.set(creditor[0], creditor[1] - amount);
  }

  return { balances, transfers, total: actual.reduce((s, e) => s + e.amount, 0) };
}
