"use client";

// F-13 정산: 실제 지출로 "누가 누구에게 얼마"를 계산하고 송금 완료를 체크한다 (FRD 10장)
// 계좌번호는 받지 않는다. 송금은 각자 쓰는 앱에서 직접.

import { useRoomContext } from "@/components/room/RoomContext";
import { card, h3, muted, subtleBox } from "@/components/styles";
import { upsertRow } from "@/lib/db";
import { settle } from "@/lib/settle";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function SettleTab() {
  const { data, supabase, run, going, nameOf, me } = useRoomContext();
  const { trip, expenses, settlements } = data;
  const result = settle(expenses, going.map((m) => m.user_id));

  // 계산 결과와 (보내는 사람, 받는 사람, 금액)이 같은 체크만 유효. 지출이 바뀌면 자연히 풀린다
  const isDone = (from: string, to: string, amount: number) =>
    settlements.some((s) => s.from_id === from && s.to_id === to && s.amount === amount && s.done);

  const toggle = (from: string, to: string, amount: number, done: boolean) =>
    run(() =>
      upsertRow(supabase, "settlements", { trip_id: trip.id, from_id: from, to_id: to, amount, done }, "trip_id,from_id,to_id,amount"),
    );

  const doneCount = result.transfers.filter((t) => isDone(t.from, t.to, t.amount)).length;

  return (
    <section className="space-y-6">
      {result.total === 0 ? (
        <p className={subtleBox}>아직 실제 지출이 없어요. 예산 탭에서 &quot;실제 지출&quot;을 기록하면 정산이 계산돼요.</p>
      ) : (
        <>
          <div className={card}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className={h3}>보낼 돈</h3>
              <span className={muted}>{result.transfers.length === 0 ? "정산할 금액이 없어요" : `${doneCount} / ${result.transfers.length} 완료`}</span>
            </div>
            <ul className="space-y-2">
              {result.transfers.map((t) => {
                const done = isDone(t.from, t.to, t.amount);
                const mine = t.from === me || t.to === me;
                return (
                  <li key={`${t.from}-${t.to}-${t.amount}`}>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 ${mine ? "border-brand-500/40" : "border-line"}`}>
                      <input type="checkbox"  checked={done} onChange={() => toggle(t.from, t.to, t.amount, !done)} />
                      <span className={`min-w-0 flex-1 ${done ? "text-text-tertiary line-through" : ""}`}>
                        <strong>{nameOf(t.from)}</strong> → <strong>{nameOf(t.to)}</strong>
                      </span>
                      <span className={`shrink-0 font-semibold ${done ? "text-text-tertiary" : ""}`}>{won(t.amount)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className={muted}>송금은 각자 쓰는 앱에서 직접 해 주세요. 보낸 뒤 체크하면 모두에게 표시돼요.</p>
          </div>

          <div className="space-y-2">
            <h3 className={h3}>사람별 내역 (실제 지출 {won(result.total)})</h3>
            <div className="overflow-hidden rounded-xl ring-1 ring-line">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken text-xs text-text-tertiary">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium">이름</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">낸 돈</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">부담액</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">차액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {result.balances.map((b) => (
                    <tr key={b.userId}>
                      <th scope="row" className="px-3 py-2 text-left font-medium">{nameOf(b.userId)}</th>
                      <td className="px-2 py-2 text-right">{b.paid.toLocaleString("ko-KR")}</td>
                      <td className="px-2 py-2 text-right">{b.owed.toLocaleString("ko-KR")}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${b.diff > 0 ? "text-brand-text" : b.diff < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                        {b.diff > 0 ? "+" : ""}
                        {b.diff.toLocaleString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={muted}>차액이 +면 받을 사람, −면 보낼 사람이에요. 1원 단위 나머지는 결제한 사람이 부담해요.</p>
          </div>
        </>
      )}
    </section>
  );
}
