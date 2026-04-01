import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";
import LeaderboardClient from "./LeaderboardClient";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const gym = await getGym();
  if (!gym) redirect("/login");
  return <LeaderboardClient />;
}
