// 서버용 Supabase 클라이언트 (서버 컴포넌트, Route Handler에서 사용)
// 요청마다 새로 만들어야 한다. 쿠키를 읽어 "지금 누가 로그인했는지"를 안다.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy.ts 가 맡는다.
          }
        },
      },
    },
  );
}

/** 로그인한 사용자 (없으면 null). getUser 는 Auth 서버에 확인하므로 위조된 쿠키를 믿지 않는다 */
export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
