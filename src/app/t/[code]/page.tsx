// 초대 링크 /t/{초대코드}
// - 로그인 안 했으면 로그인 → 다시 이 주소로 돌아온다
// - 참여 전이면 참여하기, 참여했으면 여행방을 보여준다

import Link from "next/link";
import { redirect } from "next/navigation";
import JoinCard from "@/components/room/JoinCard";
import TripRoom from "@/components/room/TripRoom";
import { h1, muted, primaryButton } from "@/components/styles";
import { previewTrip } from "@/lib/db";
import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function TripPage({ params, searchParams }: PageProps<"/t/[code]">) {
  const { code } = await params;
  const { created } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/t/${code}`)}`);
  const profile = await requireProfile(supabase, user, `/t/${code}`);

  const preview = await previewTrip(supabase, code).catch(() => null);
  if (!preview) {
    return (
      <div className="space-y-4">
        <h1 className={h1}>여행을 찾을 수 없어요</h1>
        <p className={muted}>초대 링크가 잘못됐거나 방장이 방을 삭제했어요.</p>
        <Link href="/" className={primaryButton}>내 여행으로</Link>
      </div>
    );
  }

  if (!preview.is_member) return <JoinCard code={code} preview={preview} defaultName={profile.name} />;

  return <TripRoom key={preview.id} tripId={preview.id} me={user.id} created={created === "1"} />;
}
