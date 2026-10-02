// 첫 로그인 온보딩: "여가에서 쓸 이름" 확인 + 개인정보 안내 동의. 끝나면 원래 가려던 페이지(next)로 간다.
// 이미 온보딩한 사람은 바로 next 로 보낸다.

import { redirect } from "next/navigation";
import OnboardingForm from "@/components/OnboardingForm";
import { h1, muted } from "@/components/styles";
import { avatarOf, nicknameOf, safeNext } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "처음 오셨네요" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(next)}`)}`);
  if (await getProfile(supabase, user.id)) redirect(next);

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-4">
      <div className="space-y-2">
        <h1 className={h1}>여가에 오신 걸 환영해요</h1>
        <p className={muted}>시작하기 전에 이름을 확인하고, 개인정보 안내에 동의해 주세요.</p>
      </div>
      <OnboardingForm userId={user.id} defaultName={nicknameOf(user)} avatarUrl={avatarOf(user)} next={next} />
    </div>
  );
}
