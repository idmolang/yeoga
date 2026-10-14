// Supabase 무료 플랜 일시정지 방지용 핑. Vercel Cron(하루 1회, vercel.json)과
// 외부 업타임 모니터링(UptimeRobot 등)이 같이 호출한다. 공개 엔드포인트라
// 강력한 권한을 가진 service role 키는 쓰지 않고, 브라우저에도 노출되는
// publishable(anon) 키로만 조회한다 — 민감 정보가 없고 쿼리도 가볍다.
//
// 테이블을 직접 조회하면 RLS 때문에 anon 이 못 보는 문제가 생기므로, 아무
// 테이블도 건드리지 않고 1만 반환하는 health_check() 함수를 호출한다
// (supabase/health_check.sql, Supabase SQL Editor에서 한 번 실행해 둬야 한다).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const { error } = await supabase.rpc("health_check");

  if (error) {
    console.error("[health] supabase query failed:", error.message);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", checkedAt: new Date().toISOString() });
}
