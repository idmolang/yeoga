"use client";

// F-06 조율 대시보드 (+ F-07 여행지 후보 추천)

import { useState } from "react";
import BottomCTA from "@/components/BottomCTA";
import BottomSheet from "@/components/BottomSheet";
import EmptyState from "@/components/EmptyState";
import Intro from "@/components/Intro";
import Reveal from "@/components/Reveal";
import DateCalendar from "@/components/room/DateCalendar";
import { DEPART_LABEL } from "@/components/room/ResponseForm";
import { useRoomContext } from "@/components/room/RoomContext";
import { badge, badgeTone, card, h2, h3, muted, pageDesc, pageTitle, primaryButtonXl, row, secondaryButton, subtleBox } from "@/components/styles";
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
        <span className="shrink-0 text-text-tertiary">{value}명</span>
      </div>
      <div className="h-2 rounded-full bg-surface-sunken" aria-hidden>
        <div className={`h-full rounded-full ${highlight ? "bg-brand-500" : "bg-control"}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      {extra && <p className="text-xs text-text-tertiary">{extra}</p>}
    </div>
  );
}

export default function Dashboard({ c, onConfirm }: { c: Coordination; onConfirm: () => void }) {
  const { data, isHost, supabase, run, nameOf } = useRoomContext();
  const [closeOpen, setCloseOpen] = useState(false);
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
    <div className="space-y-8">
      <Intro as="header" className="space-y-2">
        <h2 className={pageTitle}>조율 현황</h2>
        <p className={pageDesc}>
          전체 {c.memberCount}명 중 {c.responseCount}명이 응답했어요.
        </p>
      </Intro>

      {/* 응답 현황 */}
      <Reveal as="section" className={card} aria-labelledby="status-title">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="status-title" className={h2}>응답 현황</h2>
          <span className="text-[28px] font-bold leading-none tabular-nums tracking-[-0.02em] text-brand-text">
            {c.responseCount} / {c.memberCount}명
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-sunken" aria-hidden>
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${c.memberCount ? (c.responseCount / c.memberCount) * 100 : 0}%` }} />
        </div>
        {waiting.length > 0 && <p className={muted}>아직 응답 안 한 사람: {waiting.map((m) => m.display_name).join(", ")}</p>}
        <p className={muted}>응답 마감 {formatKDate(trip.response_deadline)}{trip.status === "closed" ? " · 방장이 마감했어요" : deadlinePassed ? " · 마감일이 지났어요" : ""}</p>

        {isHost &&
          (trip.status === "collecting" ? (
            <button type="button" className={`${secondaryButton} w-full`} onClick={() => setCloseOpen(true)}>
              응답 마감하기
            </button>
          ) : (
            <button type="button" className={`${secondaryButton} w-full`} onClick={() => run(() => updateTrip(supabase, trip.id, { status: "collecting" }))}>
              응답 다시 받기
            </button>
          ))}
      </Reveal>

      <BottomSheet open={closeOpen} onClose={() => setCloseOpen(false)} title="응답을 마감할까요?">
        <p className={pageDesc}>참여자가 더 이상 응답을 고칠 수 없어요.</p>
        <div className="space-y-3">
          <button
            type="button"
            className={`${primaryButtonXl} w-full`}
            onClick={() => {
              setCloseOpen(false);
              run(() => updateTrip(supabase, trip.id, { status: "closed" }));
            }}
          >
            응답 마감하기
          </button>
          <button type="button" className={`${secondaryButton} min-h-12 w-full`} onClick={() => setCloseOpen(false)}>
            취소
          </button>
        </div>
      </BottomSheet>

      {c.responseCount === 0 ? (
        <EmptyState title="아직 응답이 없어요">친구를 초대하고 응답을 기다려 주세요.</EmptyState>
      ) : (
        <>
          {/* 날짜 */}
          <Reveal as="section" className={card} aria-labelledby="dates-title">
            <h2 id="dates-title" className={h2}>날짜</h2>
            {c.periods.length > 0 ? (
              <div className="space-y-2">
                <h3 className={h3}>전원 가능한 기간</h3>
                <ol className="divide-y divide-line">
                  {c.periods.map((p, i) => (
                    <li key={p.start} className="flex items-center gap-3 py-3 text-sm">
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
          </Reveal>

          {/* 예산 */}
          <Reveal as="section" className={card} aria-labelledby="budget-title">
            <h2 id="budget-title" className={h2}>1인 예산</h2>
            <div className="space-y-1 rounded-lg bg-brand-50 px-4 py-4">
              <p className="text-sm text-brand-text">추천 1인 예산</p>
              <p className="text-[28px] font-bold leading-tight tabular-nums tracking-[-0.02em] text-brand-text">{won(c.budget.recommended)}</p>
              <p className={muted}>중간값을 1만 원 단위로 내리고, 최소값보다 낮아지지 않게 정했어요.</p>
            </div>
            <dl className="divide-y divide-line">
              {[["최소", c.budget.min], ["중간값", c.budget.median], ["최대", c.budget.max]].map(([label, value]) => (
                <div key={label as string} className={row}>
                  <dt className={muted}>{label}</dt>
                  <dd className="font-semibold tabular-nums">{won(value as number)}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-2">
              <h3 className={h3}>응답 분포</h3>
              {c.budget.buckets.map(([from, count]) => (
                <Bar key={from} label={`${(from / 10000).toLocaleString("ko-KR")}만 원대`} value={count} max={c.responseCount} />
              ))}
            </div>
          </Reveal>

          {/* 스타일·출발 시간대 */}
          <Reveal as="section" className={card} aria-labelledby="style-title">
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
                <li key={d.slot} className="rounded-full bg-surface-sunken px-3 py-1">
                  {DEPART_LABEL[d.slot]} <strong>{d.count}</strong>
                </li>
              ))}
            </ul>
          </Reveal>
        </>
      )}

      {/* 여행지 */}
      {!trip.destination_fixed && (
        <Reveal as="section" className={card} aria-labelledby="place-title">
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
                    <li key={d.name} className="flex items-start gap-3 rounded-lg border border-line p-3">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-semibold">
                          {d.name} <span className="text-sm font-normal text-text-tertiary">{formatEstimate(estimate)}</span>
                        </p>
                        <p className="text-sm">{d.summary}</p>
                        {reasons.length > 0 && <p className="text-xs text-brand-text">{reasons.join(" · ")}</p>}
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
        </Reveal>
      )}

      {isHost && (
        <BottomCTA>
          <button type="button" onClick={onConfirm} className={`${primaryButtonXl} w-full`}>
            {open ? "지금 확정하기" : "확정하기"}
          </button>
        </BottomCTA>
      )}
    </div>
  );
}
