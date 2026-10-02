// F-01 방 만들기 (로그인 필요)

import { redirect } from "next/navigation";
import CreateTripForm from "@/components/CreateTripForm";
import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "방 만들기" };

export default async function NewTripPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/new");
  const profile = await requireProfile(supabase, data.user, "/new");
  return <CreateTripForm defaultHostName={profile.name} />;
}
