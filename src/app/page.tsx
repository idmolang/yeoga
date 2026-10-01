"use client";

// F-09 여행 목록: 저장된 여행을 D-day와 함께 보여준다

import Link from "next/link";
import { useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import { ddayLabel } from "@/lib/date";
import { deleteTrip, loadTrips } from "@/lib/storage";
import type { Trip } from "@/types/trip";

export default function HomePage() {
  return (
    <ClientOnly fallback={<p className="text-slate-500">불러오는 중…</p>}>
      <TripList />
    </ClientOnly>
  );
}

function TripList() {
  const [trips, setTrips] = useState<Trip[]>(() => loadTrips());

  const handleDelete = (trip: Trip) => {
    if (!confirm(`"${trip.name}"을(를) 삭제할까요?`)) return;
    deleteTrip(trip.id);
    setTrips(loadTrips());
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">여행준비 한번에!</h1>
        <p className="text-slate-500">질문 다섯 개에 답하면 여행 계획의 뼈대가 만들어져요.</p>
      </header>

      <Link
        href="/new"
        className="block rounded-2xl bg-sky-700 px-6 py-5 text-center text-lg font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
      >
        여행 가볼까?
      </Link>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">내 여행</h2>

        {trips.length === 0 && (
          <p className="text-slate-500">아직 만든 여행이 없어요. 위 버튼으로 첫 여행을 시작해 보세요.</p>
        )}

        <ul className="space-y-2">
          {trips.map((trip) => (
            <li
              key={trip.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <Link href={`/trip/${trip.id}`} className="flex-1">
                <span className="font-medium">{trip.name}</span>
                <span className="ml-2 text-sm text-slate-500">
                  {trip.startDate} ~ {trip.endDate}
                </span>
              </Link>
              <span className="mx-3 text-sm font-semibold text-sky-700">{ddayLabel(trip.startDate)}</span>
              <button
                type="button"
                onClick={() => handleDelete(trip)}
                className="text-sm text-slate-400 hover:text-red-600"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
