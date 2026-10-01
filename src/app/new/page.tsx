// F-01 방 만들기 (로그인 필요)

import { redirect } from "next/navigation";
import CreateTripForm from "@/components/CreateTripForm";
import { nicknameOf } from "@/lib/auth";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "방 만들기" };

export default async function NewTripPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/new");
  return <CreateTripForm defaultHostName={nicknameOf(user)} />;
}
