// 브라우저용 Supabase 클라이언트 (클라이언트 컴포넌트에서 사용)
// 세션은 쿠키에 저장되어 서버와 같은 로그인 상태를 공유한다.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
