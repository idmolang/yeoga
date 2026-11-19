// F-15 예약 사이트 바로가기 버튼 (새 탭, rel="noopener noreferrer")

import { useRoomContext } from "@/components/room/RoomContext";
import { KIND_LABEL, type BookingKind } from "@/data/booking-sites";
import { bookingLinks, kindsFor } from "@/lib/booking";

const linkClass =
  "inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium transition-colors duration-(--dur-fast) hover:border-brand-500 hover:text-brand-text focus-visible:outline-2 focus-visible:outline-brand-500";

/** kinds 를 주면 그 종류만 (할 일 옆), 안 주면 여행에 맞는 전체 (일정 탭) */
export default function BookingLinks({ kinds, compact }: { kinds?: BookingKind[]; compact?: boolean }) {
  const { data, going } = useRoomContext();
  // 여행에 맞는 종류만 (예: 해외 여행의 "교통편 예매"에는 국내 교통 사이트를 붙이지 않음)
  const show = (kinds ?? kindsFor(data.trip)).filter((k) => kindsFor(data.trip).includes(k));
  if (show.length === 0) return null;
  const links = bookingLinks(data.trip, going.length, show);

  if (compact) {
    return (
      <span className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {l.name} <span aria-hidden>↗</span>
            <span className="sr-only">(새 탭)</span>
          </a>
        ))}
      </span>
    );
  }

  return (
    <div className="space-y-3 rounded-xl bg-surface p-4 ring-1 ring-line">
      <div>
        <p className="font-semibold">예약 사이트 바로가기</p>
        <p className="text-xs text-text-tertiary">예약·결제는 각 사이트에서 직접 해요. ✓ 표시는 여행지·날짜·인원을 채워서 열려요.</p>
      </div>
      {show.map((kind) => (
        <div key={kind} className="space-y-1.5">
          <p className="text-xs font-semibold text-text-tertiary">{KIND_LABEL[kind]}</p>
          <div className="flex flex-wrap gap-1.5">
            {links
              .filter((l) => l.kind === kind)
              .map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {l.prefilled && <span aria-label="검색 조건 채움" className="text-brand-text">✓</span>}
                  {l.name} <span aria-hidden>↗</span>
                  <span className="sr-only">(새 탭)</span>
                </a>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
