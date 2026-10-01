// 로그인 관련 공용 함수

import type { User } from "@supabase/supabase-js";

/** 로그인 후 돌아갈 주소. 다른 사이트로 튀는 것(오픈 리다이렉트)을 막으려고 우리 사이트 경로만 허용 */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

/** 소셜 계정의 닉네임 (방 참여 때 표시 이름 기본값). 이메일은 쓰지 않는다 */
export function nicknameOf(user: User) {
  const m = user.user_metadata ?? {};
  const name = [m.name, m.full_name, m.nickname, m.preferred_username, m.user_name].find(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
  return (name ?? "여행자").trim().slice(0, 10);
}
