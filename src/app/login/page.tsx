// 로그인: 구글·카카오 소셜 로그인. ?next= 로 로그인 후 돌아갈 주소를 받는다 (초대 링크 등)

import { redirect } from "next/navigation";
import LoginButtons from "@/components/LoginButtons";
import { h1, muted } from "@/components/styles";
import { safeNext } from "@/lib/auth";
import { getUser } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : "";

  if (await getUser()) redirect(next);

  return (
    <div className="mx-auto max-w-sm space-y-8 pt-8">
      <div className="space-y-2 text-center">
        <h1 className={h1}>여가에 로그인</h1>
        <p className={muted}>
          {next.startsWith("/t/") ? "로그인하면 초대받은 여행으로 바로 돌아가요." : "다같이 여행 가자! 로그인하고 시작해요."}
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <LoginButtons next={next} />
      <p className={`text-center ${muted}`}>이메일·연락처는 받지 않아요. 이름은 소셜 닉네임을 쓰고, 방마다 바꿀 수 있어요.</p>
    </div>
  );
}
