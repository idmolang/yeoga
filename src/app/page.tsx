// 메인: 로그인 전에는 소개, 로그인 후에는 "다같이 여행가자!" 버튼과 내 방 목록 (F-04)

import Link from "next/link";
import { badge, badgeTone, h1, h2, muted, primaryButton } from "@/components/styles";
import { formatRange } from "@/lib/date";
import { listMyTrips, type TripListItem } from "@/lib/db";
import { ddayText, stageLabel, stageOf } from "@/lib/stage";
import { createClient } from "@/lib/supabase/server";

const bigButton = `${primaryButton} w-full rounded-2xl py-5 text-lg`;

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return (
      <div className="space-y-10 pt-6">
        <section className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight">다같이 여행가자!</h1>
          <p className="text-base text-slate-600 dark:text-slate-300">
            단톡방에서 날짜·예산 맞추다 지치지 마세요. 여가가 사람을 모으고, 다 같이 정하고, 함께 준비하게 도와줘요.
          </p>
        </section>
        <ol className="space-y-3">
          {[
            ["모으기", "방을 만들고 초대 링크를 단톡방에 보내요."],
            ["조율", "각자 가능한 날짜·예산·스타일을 답하면 자동으로 모아 보여줘요."],
            ["준비", "방장이 확정하면 할 일·일정·예산·준비물이 만들어지고, 같이 고치고 정산해요."],
          ].map(([title, desc], i) => (
            <li key={title} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">{i + 1}</span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className={muted}>{desc}</span>
              </span>
            </li>
          ))}
        </ol>
        <Link href="/login?next=/new" className={bigButton}>
          로그인하고 시작하기
        </Link>
      </div>
    );
  }

  const trips = await listMyTrips(supabase).catch(() => [] as TripListItem[]);
  const hosted = trips.filter((t) => t.host_id === user.id);
  const joined = trips.filter((t) => t.host_id !== user.id);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className={h1}>내 여행</h1>
        <p className={muted}>방을 만들어 친구를 부르거나, 받은 초대 링크로 참여하세요.</p>
      </header>

      <Link href="/new" className={bigButton}>
        다같이 여행가자!
      </Link>

      <TripSection title="내가 만든 방" trips={hosted} empty="아직 만든 방이 없어요." />
      <TripSection title="참여한 방" trips={joined} empty="초대 링크로 참여한 방이 여기에 보여요." />
    </div>
  );
}

function TripSection({ title, trips, empty }: { title: string; trips: TripListItem[]; empty: string }) {
  return (
    <section className="space-y-3">
      <h2 className={h2}>{title}</h2>
      {trips.length === 0 ? (
        <p className={muted}>{empty}</p>
      ) : (
        <ul className="space-y-2">
          {trips.map((t) => {
            const stage = stageOf(t, t.responses[0]?.count ?? 0);
            return (
              <li key={t.id}>
                <Link
                  href={`/t/${t.invite_code}`}
                  className="block space-y-1.5 rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-sky-400 dark:bg-slate-900 dark:ring-slate-800"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{t.name}</span>
                    <span className={`${badge} ${stage === "prepare" ? badgeTone.green : stage === "coordinate" ? badgeTone.amber : badgeTone.sky}`}>
                      {stageLabel(stage)}
                    </span>
                  </span>
                  <span className={`flex flex-wrap gap-x-3 ${muted}`}>
                    <span>{t.destination ?? "여행지 미정"}</span>
                    <span>{t.start_date && t.end_date ? formatRange(t.start_date, t.end_date) : `후보 ${formatRange(t.window_start, t.window_end)}`}</span>
                    <span>{t.members[0]?.count ?? 0}명</span>
                    <span className="font-semibold text-sky-700 dark:text-sky-300">{ddayText(t)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
