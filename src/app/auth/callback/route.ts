// OAuth 콜백: 구글·카카오 로그인 후 Supabase가 ?code=... 를 붙여 이리로 보낸다.
// code 를 세션(쿠키)으로 바꾼 뒤, 로그인 전에 보던 주소(next)로 돌려보낸다.

import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const login = new URL("/login", origin);
  login.searchParams.set("next", next);
  login.searchParams.set("error", searchParams.get("error_description") ?? "로그인하지 못했어요");
  return NextResponse.redirect(login);
}
