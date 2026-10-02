// 내 정보: 이름 수정, 로그아웃, 회원 탈퇴

import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/me/ProfileForm";
import WithdrawSection, { type HostedTrip } from "@/components/me/WithdrawSection";
import { card, h1, h2, muted, secondaryButton } from "@/components/styles";
import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "내 정보" };

export default async function MePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login?next=/me");
  const profile = await requireProfile(supabase, user, "/me");

  // 탈퇴 때 방장을 넘길 수 있도록, 내가 방장인 방과 그 방의 다른 참여자
  const { data: trips } = await supabase.from("trips").select("id, name").eq("host_id", user.id).order("created_at");
  const ids = (trips ?? []).map((t) => t.id);
  const { data: others } = ids.length
    ? await supabase
        .from("members")
        .select("trip_id, user_id, display_name")
        .in("trip_id", ids)
        .eq("withdrawn", false)
        .neq("user_id", user.id)
        .order("joined_at")
    : { data: [] };
  const hosted: HostedTrip[] = (trips ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    others: (others ?? []).filter((m) => m.trip_id === t.id).map((m) => ({ userId: m.user_id, name: m.display_name })),
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className={h1}>내 정보</h1>
        <p className={muted}>
          여가가 가진 내 정보는 닉네임·프로필 사진뿐이에요.{" "}
          <Link href="/privacy" className="underline">
            개인정보 안내
          </Link>
        </p>
      </header>

      <ProfileForm userId={user.id} name={profile.name} avatarUrl={profile.avatar_url} />

      <section className={card}>
        <h2 className={h2}>로그아웃</h2>
        <form action="/auth/signout" method="post">
          <button type="submit" className={secondaryButton}>
            로그아웃
          </button>
        </form>
      </section>

      <WithdrawSection hosted={hosted} />
    </div>
  );
}
