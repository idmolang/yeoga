"use client";

// F-06 조율 대시보드 (+ F-07 여행지 후보 추천)

import DateCalendar from "@/components/room/DateCalendar";
import { DEPART_LABEL } from "@/components/room/ResponseForm";
import { useRoomContext } from "@/components/room/RoomContext";
import { badge, badgeTone, card, h2, h3, muted, primaryButton, secondaryButton, subtleBox } from "@/components/styles";
import type { Coordination, Period } from "@/lib/coordinate";
import { formatKDate } from "@/lib/date";
import { addOption, updateTrip } from "@/lib/db";
import { formatEstimate, recommend } from "@/lib/recommend";
import { responsesOpen } from "@/lib/stage";
import { LABELS } from "@/types/trip";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

/** 가로 막대 하나 */
function Bar({ label, value, max, highlight, extra }: { label: string; value: number; max: number; highlight?: boolean; extra?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-medium">
          {label} {highlight && <span className={`${badge} ${badgeTone.sky} ml-1`}>반영</span>}
        </span>
        <span className="shrink-0 text-slate-500 dark:text-slate-400">{value}명</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
        <div className={`h-full rounded-full ${highlight ? "bg-sky-600" : "bg-slate-400 dark:bg-slate-500"}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      {extra && <p className="text-xs text-slate-500 dark:text-slate-400">{extra}</p>}
    </div>
  );
}

export default function Dashboard({ c, onConfirm }: { c: Coordination; onConfirm: () => void }) {
  const { data, isHost, supabase, run, nameOf } = useRoomContext();
  const { trip } = data;
  const open = responsesOpen(trip);
  const waiting = data.members.filter((m) => !c.responders.includes(m.user_id));
  const deadlinePassed = trip.status === "collecting" && !open;

  const periodText = (p: Period) => `${formatKDate(p.start)} ~ ${formatKDate(p.end)} (${p.days - 1}박 ${p.days}일)`;

  // F-07: 여행지가 미정이면 응답 집계(추천 기간·예산·스타일)로 후보 추천
  const best = c.periods[0] ?? c.fallback;
  const recs =
    !trip.destination_fixed && c.responseCount > 0 && best
      ? recommend({ region: trip.region, startDate: best.start, endDate: best.end, budgetPerPerson: c.budget.recommended, styles: c.planStyles })
      : [];

  return (
    <div className="space-y-6">
      {/* 응답 현황 + 방장 버튼 */}
      <section className={card} aria-labelledby="status-title">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="status-title" className={h2}>응답 현황</h2>
          <span className="text-lg font-bold text-sky-700 dark:text-sky-300">
            {c.responseCount} / {c.memberCount}명
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
          <div className="h-full rounded-full bg-sky-600" style={{ width: `${c.memberCount ? (c.responseCount / c.memberCount) * 100 : 0}%` }} />
        </div>
        {waiting.length > 0 && <p className={muted}>아직 응답 안 한 사람: {waiting.map((m) => m.display_name).join(", ")}</p>}
        <p className={muted}>응답 마감 {formatKDate(trip.response_deadline)}{trip.status === "closed" ? " · 방장이 마감했어요" : deadlinePassed ? " · 마감일이 지났어요" : ""}</p>

        {isHost && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className={`${primaryButton} ${!open ? "ring-4 ring-sky-200 dark:ring-sky-900" : ""}`}
            >
              {open ? "지금 확정하기" : "확정하기"}
            </button>
            {trip.status === "collecting" ? (
              <button type="button" className={secondaryButton} onClick={() => confirm("응답을 마감할까요? 참여자가 더 이상 응답을 고칠 수 없어요.") && run(() => updateTrip(supabase, trip.id, { status: "closed" }))}>
                응답 마감하기
              </button>
            ) : (
              <button type="button" className={secondaryButton} onClick={() => run(() => updateTrip(supabase, trip.id, { status: "collecting" }))}>
                응답 다시 받기
              </button>
            )}
          </div>
        )}
      </section>

      {c.responseCount === 0 ? (
        <p className={subtleBox}>아직 응답이 없어요. 친구를 초대하고 응답을 기다려 주세요.</p>
      ) : (
        <>
          {/* 날짜 */}
          <section className={card} aria-labelledby="dates-title">
            <h2 id="dates-title" className={h2}>날짜</h2>
            {c.periods.length > 0 ? (
              <div className="space-y-2">
                <h3 className={h3}>전원 가능한 기간</h3>
                <ol className="space-y-1.5">
                  {c.periods.map((p, i) => (
                    <li key={p.start} className="flex items-center gap-2 text-sm">
                      <span className={`${badge} ${i === 0 ? badgeTone.sky : badgeTone.gray}`}>{i === 0 ? "추천" : `${i + 1}순위`}</span>
                      {periodText(p)}
                    </li>
                  ))}
                </ol>
              </div>
            ) : c.fallback ? (
              <div className={`${subtleBox} space-y-1`}>
                <p className="font-semibold">전원 가능한 연속 기간이 없어요. 차선 기간:</p>
                <p>{periodText(c.fallback)} · {c.fallback.count}명 가능</p>
                <p className="text-red-600 dark:text-red-400">빠지는 사람: {c.fallback.missing.map(nameOf).join(", ")}</p>
              </div>
            ) : (
              <p className={muted}>가능한 날짜가 겹치지 않아요.</p>
            )}
            <DateCalendar
              mode="heat"
              dates={c.days.map((d) => d.date)}
              counts={new Map(c.days.map((d) => [d.date, d.available.length]))}
              names={new Map(c.days.map((d) => [d.date, d.available.map(nameOf)]))}
              total={c.responseCount}
            />
            <p className={muted}>색이 진할수록 가능한 사람이 많아요. 테두리는 전원 가능한 날이에요.</p>
          </section>

          {/* 예산 */}
          <section className={card} aria-labelledby="budget-title">
            <h2 id="budget-title" className={h2}>1인 예산</h2>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[["최소", c.budget.min], ["중간값", c.budget.median], ["최대", c.budget.max]].map(([label, value]) => (
                <div key={label as string} className="rounded-xl bg-slate-100 px-2 py-2.5 dark:bg-slate-800">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="text-sm font-semibold">{won(value as number)}</dd>
                </div>
              ))}
            </dl>
            <p className="text-base">
              추천 1인 예산 <strong className="text-sky-700 dark:text-sky-300">{won(c.budget.recommended)}</strong>
              <span className={`block ${muted}`}>중간값을 1만 원 단위로 내리고, 최소값보다 낮아지지 않게 정했어요.</span>
            </p>
            <div className="space-y-2">
              <h3 className={h3}>응답 분포</h3>
              {c.budget.buckets.map(([from, count]) => (
                <Bar key={from} label={`${(from / 10000).toLocaleString("ko-KR")}만 원대`} value={count} max={c.responseCount} />
              ))}
            </div>
          </section>

          {/* 스타일·출발 시간대 */}
          <section className={card} aria-labelledby="style-title">
            <h2 id="style-title" className={h2}>여행 스타일</h2>
            <div className="space-y-3">
              {c.styleCounts.map((s) => (
                <Bar key={s.style} label={LABELS.style[s.style]} value={s.count} max={c.responseCount} highlight={c.planStyles.includes(s.style)} />
              ))}
            </div>
            <p className={muted}>과반이 고른 스타일(없으면 1위)이 계획 만들기에 반영돼요.</p>
            <h3 className={h3}>선호 출발 시간대</h3>
            <ul className="flex flex-wrap gap-2 text-sm">
              {c.departCounts.map((d) => (
                <li key={d.slot} className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                  {DEPART_LABEL[d.slot]} <strong>{d.count}</strong>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* 여행지 */}
      {!trip.destination_fixed && (
        <section className={card} aria-labelledby="place-title">
          <h2 id="place-title" className={h2}>여행지 투표</h2>
          {c.destinations.length === 0 ? (
            <p className={muted}>아직 후보가 없어요. 응답할 때 여행지를 제안할 수 있어요.</p>
          ) : (
            <div className="space-y-3">
              {c.destinations.map((d, i) => (
                <Bar
                  key={d.option.id}
                  label={d.option.name}
                  value={d.voters.length}
                  max={Math.max(c.responseCount, 1)}
                  highlight={i === 0 && d.voters.length > 0}
                  extra={d.voters.length ? d.voters.map(nameOf).join(", ") : undefined}
                />
              ))}
            </div>
          )}

          {recs.length > 0 && (
            <div className="space-y-2">
              <h3 className={h3}>이런 여행지는 어때요?</h3>
              <p className={muted}>응답을 모은 기간·예산·스타일에 맞춘 추천이에요.</p>
              <ul className="space-y-2">
                {recs.map(({ destination: d, estimate, reasons }) => {
                  const listed = data.options.some((o) => o.name === d.name);
                  return (
                    <li key={d.name} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-semibold">
                          {d.name} <span className="text-sm font-normal text-slate-500">{formatEstimate(estimate)}</span>
                        </p>
                        <p className="text-sm">{d.summary}</p>
                        {reasons.length > 0 && <p className="text-xs text-sky-700 dark:text-sky-300">{reasons.join(" · ")}</p>}
                      </div>
                      {open && (
                        <button type="button" disabled={listed} className={secondaryButton} onClick={() => run(() => addOption(supabase, trip.id, d.name))}>
                          {listed ? "후보에 있음" : "후보에 올리기"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
