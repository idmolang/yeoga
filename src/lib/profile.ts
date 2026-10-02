// 회원 프로필(온보딩) 확인. profiles 행이 있으면 온보딩을 마친 사람이다.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { ProfileRow } from "@/types/db";

/** 내 프로필 (온보딩 전이면 null) */
export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  return data as ProfileRow | null;
}

/** 온보딩을 안 했으면 /onboarding 으로 보낸다 (끝나면 next 로 돌아온다) */
export async function requireProfile(supabase: SupabaseClient, user: User, next: string) {
  const profile = await getProfile(supabase, user.id);
  if (!profile) redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  return profile;
}
