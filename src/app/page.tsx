// 메인: 로그인 전에는 화면을 꽉 채우는 큰 섹션 소개, 로그인 후에는 "다같이 여행가자!" 버튼과 내 방 목록 (F-04)

import Link from "next/link";
import BottomCTA from "@/components/BottomCTA";
import EmptyState from "@/components/EmptyState";
import Intro from "@/components/Intro";
import Reveal from "@/components/Reveal";
import { badge, badgeTone, h2, muted, pageDesc, pageTitle, primaryButtonXl } from "@/components/styles";
import { formatRange } from "@/lib/date";
import { listMyTrips, type TripListItem } from "@/lib/db";
import { requireProfile } from "@/lib/profile";
import { ddayText, stageLabel, stageOf } from "@/lib/stage";
import { createClient } from "@/lib/supabase/server";

const bigButton = `${primaryButtonXl} w-full`;
const bigTitle = "text-balance text-[44px] font-bold leading-[1.2] tracking-[-0.03em] sm:text-[56px]";
// 헤더(56px)를 뺀 화면 높이를 꽉 채우는 섹션
const fullSection = "flex min-h-[calc(100svh-3.5rem-3rem)] flex-col justify-center gap-6 py-16";

const STEPS: { title: string; desc: string; visual: "gather" | "align" | "prepare" }[] = [
  { title: "모으기", desc: "방을 만들고 초대 링크를 단톡방에 보내요.", visual: "gather" },
  { title: "조율", desc: "각자 가능한 날짜·예산·스타일을 답하면 자동으로 모아 보여줘요.", visual: "align" },
  { title: "준비", desc: "방장이 확정하면 할 일·일정·예산·준비물이 만들어지고, 같이 고치고 정산해요.", visual: "prepare" },
];

/** 섹션마다 하나씩 놓는 장식 그림 (CSS로 그린 일반 도형, 스크린리더에서는 숨김) */
function Visual({ kind }: { kind: "gather" | "align" | "prepare" }) {
  if (kind === "gather") {
    return (
      <div className="flex items-center" aria-hidden>
        {["bg-brand-500", "bg-brand-600", "bg-brand-700", "bg-line"].map((c, i) => (
          <span key={i} className={`-ml-3 size-16 rounded-full ring-4 ring-background first:ml-0 ${c}`} />
        ))}
      </div>
    );
  }
  if (kind === "align") {
    const on = new Set([8, 9, 10, 15, 16, 17, 18, 19]);
    return (
      <div className="grid w-fit grid-cols-7 gap-2" aria-hidden>
        {Array.from({ length: 21 }, (_, i) => (
          <span key={i} className={`size-9 rounded-md ${on.has(i) ? "bg-brand-600" : "bg-surface-sunken"}`} />
        ))}
      </div>
    );
  }
  return (
    <div className="w-full max-w-sm space-y-3" aria-hidden>
      {[true, true, false].map((done, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl bg-surface p-4 ring-1 ring-line">
          <span className={`size-6 rounded-md ${done ? "bg-brand-600" : "border-[1.5px] border-control"}`} />
          <span className={`h-3 rounded-full bg-surface-sunken ${i === 0 ? "w-40" : i === 1 ? "w-28" : "w-36"}`} />
        </div>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return (
      <div>
        <section className={fullSection}>
          <Intro as="h1" size="lg" className={bigTitle}>
            다같이 여행가자!
          </Intro>
          <Intro as="p" size="lg" step={1} className="max-w-md text-[17px] leading-relaxed text-text-secondary">
            단톡방에서 날짜·예산 맞추다 지치지 마세요. 여가가 사람을 모으고, 다 같이 정하고, 함께 준비하게 도와줘요.
          </Intro>
        </section>

        {STEPS.map((s, i) => (
          <section key={s.title} className={fullSection}>
            <Reveal size="lg">
              <p className="text-[15px] font-bold text-brand-text">0{i + 1}</p>
            </Reveal>
            <Reveal size="lg" index={1}>
              <h2 className={bigTitle}>{s.title}</h2>
            </Reveal>
            <Reveal size="lg" index={2}>
              <p className="max-w-md text-[17px] leading-relaxed text-text-secondary">{s.desc}</p>
            </Reveal>
            <Reveal size="lg" index={3}>
              <Visual kind={s.visual} />
            </Reveal>
          </section>
        ))}

        <p className={`pb-4 text-center ${muted}`}>
          <Link href="/privacy" className="underline">
            개인정보 안내
          </Link>
        </p>

        <BottomCTA>
          <Link href="/login?next=/new" className={bigButton}>
            로그인하고 시작하기
          </Link>
        </BottomCTA>
      </div>
    );
  }

  await requireProfile(supabase, user, "/");
  const trips = await listMyTrips(supabase).catch(() => [] as TripListItem[]);
  const hosted = trips.filter((t) => t.host_id === user.id);
  const joined = trips.filter((t) => t.host_id !== user.id);

  return (
    <div className="space-y-10">
      <Intro as="header" className="space-y-2">
        <h1 className={pageTitle}>내 여행</h1>
        <p className={pageDesc}>방을 만들어 친구를 부르거나, 받은 초대 링크로 참여하세요.</p>
      </Intro>

      <TripSection title="내가 만든 방" trips={hosted} empty="아직 만든 방이 없어요." />
      <TripSection title="참여한 방" trips={joined} empty="초대 링크로 참여한 방이 여기에 보여요." />

      <p className={`text-center ${muted}`}>
        <Link href="/privacy" className="underline">
          개인정보 안내
        </Link>
      </p>

      <BottomCTA>
        <Link href="/new" className={bigButton}>
          다같이 여행가자!
        </Link>
      </BottomCTA>
    </div>
  );
}

function TripSection({ title, trips, empty }: { title: string; trips: TripListItem[]; empty: string }) {
  return (
    <Reveal as="section" className="space-y-4">
      <h2 className={h2}>{title}</h2>
      {trips.length === 0 ? (
        <EmptyState icon="trip" title={empty} />
      ) : (
        <ul className="space-y-4">
          {trips.map((t, i) => {
            const stage = stageOf(t, t.responses[0]?.count ?? 0);
            return (
              <Reveal as="li" index={i} key={t.id}>
                <Link
                  href={`/t/${t.invite_code}`}
                  className="block space-y-2 rounded-xl bg-surface p-5 ring-1 ring-line transition-colors duration-(--dur-base) hover:ring-brand-500 active:bg-surface-sunken"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-[17px] font-semibold">{t.name}</span>
                    <span className={`${badge} ${stage === "prepare" ? badgeTone.green : stage === "coordinate" ? badgeTone.amber : badgeTone.sky}`}>
                      {stageLabel(stage)}
                    </span>
                  </span>
                  <span className={`flex flex-wrap gap-x-3 ${muted}`}>
                    <span>{t.destination ?? "여행지 미정"}</span>
                    <span>{t.start_date && t.end_date ? formatRange(t.start_date, t.end_date) : `후보 ${formatRange(t.window_start, t.window_end)}`}</span>
                    <span>{t.members[0]?.count ?? 0}명</span>
                    <span className="font-semibold text-brand-text">{ddayText(t)}</span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      )}
    </Reveal>
  );
}
