"use client";

// 여행 상세: 자동 생성된 뼈대를 탭별로 보고 다듬는 화면 + 엑셀 다운로드(F-08)

import Link from "next/link";
import { use, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import { ddayLabel } from "@/lib/date";
import { exportTripToExcel } from "@/lib/excel";
import { getTrip, upsertTrip } from "@/lib/storage";
import { LABELS, type Trip } from "@/types/trip";

const TABS = ["할 일", "일정", "예산", "준비물"] as const;
type Tab = (typeof TABS)[number];

export default function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ClientOnly fallback={<p className="text-slate-500">불러오는 중…</p>}>
      <TripDetail id={id} />
    </ClientOnly>
  );
}

function TripDetail({ id }: { id: string }) {
  const [trip, setTrip] = useState<Trip | null>(() => getTrip(id) ?? null);
  const [tab, setTab] = useState<Tab>("할 일");
  const [saveFailed, setSaveFailed] = useState(false);

  /** 화면 상태와 저장소를 함께 갱신 */
  const update = (next: Trip) => {
    setTrip(next);
    setSaveFailed(!upsertTrip(next));
  };

  if (trip === null)
    return (
      <div className="space-y-4">
        <p>여행을 찾을 수 없어요.</p>
        <Link href="/" className="text-sky-700 underline">
          목록으로
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      {saveFailed && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          저장되지 않았습니다. 브라우저 저장 공간을 확인해 주세요.
        </p>
      )}

      <header className="space-y-1">
        <Link href="/" className="text-sm text-slate-500 hover:underline">
          ← 내 여행
        </Link>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-bold">{trip.name}</h1>
          <span className="font-semibold text-sky-700">{ddayLabel(trip.startDate)}</span>
        </div>
        <p className="text-sm text-slate-500">
          {trip.destination} · {trip.startDate} ~ {trip.endDate} · {trip.people}명 ·{" "}
          {trip.styles.map((s) => LABELS.style[s]).join(", ")}
        </p>
      </header>

      <button
        type="button"
        onClick={() => exportTripToExcel(trip)}
        className="w-full rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white hover:bg-sky-800"
      >
        엑셀로 다운로드
      </button>

      <nav className="flex gap-1 border-b border-slate-200 dark:border-slate-700" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${
              tab === t ? "border-b-2 border-sky-700 font-semibold" : "text-slate-500"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "할 일" && (
        <section className="space-y-2">
          {/* TODO(F-05): 할 일 추가 폼 (할 일, 마감일, 담당자), 삭제 버튼 */}
          {trip.todos.map((todo) => (
            <label key={todo.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() =>
                  update({
                    ...trip,
                    todos: trip.todos.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)),
                  })
                }
              />
              <span className={`flex-1 ${todo.done ? "text-slate-400 line-through" : ""}`}>
                {todo.title}
              </span>
              {todo.urgent && !todo.done && (
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">급함</span>
              )}
              <span className="w-16 text-right text-sm text-slate-500">{ddayLabel(todo.dueDate)}</span>
            </label>
          ))}
        </section>
      )}

      {tab === "일정" && (
        <section className="space-y-4">
          {/* TODO(F-04): 슬롯을 눌러 수정하는 일정 폼 (시간, 장소, 할 일, 비용, 예약 필요, 메모) */}
          {[...new Set(trip.schedule.map((s) => s.date))].map((date, i) => (
            <div key={date} className="space-y-1">
              <h3 className="font-semibold">
                {i + 1}일차 <span className="text-sm font-normal text-slate-500">{date}</span>
              </h3>
              {trip.schedule
                .filter((s) => s.date === date)
                .map((s) => (
                  <div key={s.id} className="flex gap-3 text-sm">
                    <span className="w-10 text-slate-500">{LABELS.slot[s.slot]}</span>
                    <span>{s.activity || s.place || "비어 있음"}</span>
                  </div>
                ))}
            </div>
          ))}
        </section>
      )}

      {tab === "예산" && (
        <section className="space-y-2">
          {/* TODO(F-06): 예산·지출 추가 폼 (항목, 카테고리, 금액, 예산/실제 지출) */}
          {trip.budget.map((b) => (
            <div key={b.id} className="flex justify-between text-sm">
              <span>
                {LABELS.budgetCategory[b.category]} · {b.title}
              </span>
              <span>{b.amount.toLocaleString("ko-KR")}원</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold dark:border-slate-700">
            <span>총예산</span>
            <span>
              {trip.budget.reduce((sum, b) => sum + b.amount, 0).toLocaleString("ko-KR")}원
            </span>
          </div>
        </section>
      )}

      {tab === "준비물" && (
        <section className="space-y-2">
          {/* TODO(F-10): 준비물 추가 폼 (준비물, 분류) */}
          {trip.packing.map((item) => (
            <label key={item.id} className="flex items-center gap-3 px-2 py-1">
              <input
                type="checkbox"
                checked={item.packed}
                onChange={() =>
                  update({
                    ...trip,
                    packing: trip.packing.map((p) =>
                      p.id === item.id ? { ...p, packed: !p.packed } : p,
                    ),
                  })
                }
              />
              <span className={item.packed ? "text-slate-400 line-through" : ""}>{item.name}</span>
              <span className="text-xs text-slate-500">{item.group}</span>
            </label>
          ))}
        </section>
      )}
    </div>
  );
}
