"use client";

// 여행 상세: 자동 생성된 뼈대를 탭별로 보고 다듬는 화면 + 엑셀 다운로드(F-08)

import Link from "next/link";
import { use, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import BudgetTab from "@/components/trip/BudgetTab";
import PackingTab from "@/components/trip/PackingTab";
import TodoTab from "@/components/trip/TodoTab";
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

      {tab === "할 일" && <TodoTab trip={trip} update={update} />}

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

      {tab === "예산" && <BudgetTab trip={trip} update={update} />}

      {tab === "준비물" && <PackingTab trip={trip} update={update} />}
    </div>
  );
}
