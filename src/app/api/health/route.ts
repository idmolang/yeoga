// Supabase 무료 플랜 일시정지 방지용 핑. Vercel Cron(하루 1회, vercel.json)과
// 외부 업타임 모니터링(UptimeRobot 등)이 같이 호출한다.
//
// public 스키마의 모든 테이블이 RLS 정책을 authenticated 에게만 허용하므로
// (anon 은 어떤 테이블도 못 봄), 로그인 세션 없는 이 핑은 RLS를 우회하는
// service role 키로만 테이블을 조회할 수 있다. 이 키는 가장 강력한 키라
// NEXT_PUBLIC_ 로 두지 않고, CRON_SECRET 없이는 아무도 호출 못 하게 막는다.
// Vercel Cron 은 Authorization 헤더로, 헤더를 못 보내는 무료 모니터링
// 서비스는 ?token= 쿼리로 같은 값을 보내면 된다.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const token = request.nextUrl.searchParams.get("token");
    if (authHeader !== `Bearer ${cronSecret}` && token !== cronSecret) {
      return NextResponse.json({ status: "error" }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase.from("profiles").select("id").limit(1);

  if (error) {
    console.error("[health] supabase query failed:", error.message);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", checkedAt: new Date().toISOString() });
}
