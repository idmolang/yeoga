// 여행 화면 상단: 이름, 단계(모으기 → 조율 → 준비), D-day·인원·예산 요약

import StageStepper from "@/components/room/StageStepper";
import { muted, pageTitle } from "@/components/styles";
import { formatRange } from "@/lib/date";
import { ddayText, type Stage } from "@/lib/stage";
import { LABELS } from "@/types/trip";
import type { TripRow } from "@/types/db";

export default function TripHeader({
  trip,
  stage,
  people,
  budget,
}: {
  trip: TripRow;
  stage: Stage;
  people: string;
  budget: string;
}) {
  const when =
    trip.start_date && trip.end_date
      ? formatRange(trip.start_date, trip.end_date)
      : `후보 ${formatRange(trip.window_start, trip.window_end)}`;
  const where = trip.destination ?? "여행지 미정";

  return (
    <header className="intro space-y-4">
      <div className="space-y-1">
        <h1 className={pageTitle}>{trip.name}</h1>
        <p className={muted}>
          {LABELS.region[trip.region]} · {where} · {when}
        </p>
      </div>
      <StageStepper stage={stage} />
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {[
          ["일정", ddayText(trip)],
          ["인원", people],
          ["1인 예산", budget],
        ].map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="text-text-tertiary">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
