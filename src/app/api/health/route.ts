// Supabase 무료 플랜 일시정지 방지용 핑. Vercel Cron(하루 1회, vercel.json)과
// 외부 업타임 모니터링(UptimeRobot 등)이 같이 호출한다. 응답에 민감 정보가 없고
// 쿼리도 가벼워서 비밀키로 막지 않고 공개해 둔다.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const { error } = await supabase.from("profiles").select("id").limit(1);

  if (error) {
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", checkedAt: new Date().toISOString() });
}
