// Next.js 16 proxy (예전 이름 middleware): 페이지를 그리기 전에 로그인 세션을 갱신한다.
// 액세스 토큰이 만료됐으면 여기서 새 토큰을 받아 쿠키에 다시 써 준다.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // 이 호출이 필요할 때 토큰을 갱신한다 (결과는 쓰지 않음)
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // 정적 파일·이미지·헬스체크(크론·외부 모니터링용, 로그인과 무관)는 건너뛴다
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
