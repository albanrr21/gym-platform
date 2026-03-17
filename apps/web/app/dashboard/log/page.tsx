import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";
import LogWorkoutForm from "./LogWorkoutForm";

export default async function LogWorkoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const gym = await getGym();
  if (!gym) redirect("/login");

  return <LogWorkoutForm gymId={gym.id} />;
}
