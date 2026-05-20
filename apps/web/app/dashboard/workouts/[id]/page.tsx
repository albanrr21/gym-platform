import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WorkoutDetail from "./WorkoutDetail";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await Promise.resolve(params);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workout } = await supabase
    .from("workouts")
    .select(
      "id, logged_at, notes, exercises(id, name, sets(set_number, weight_kg, reps, rpe, completed))",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!workout) redirect("/dashboard");


  return <WorkoutDetail workout={workout} />;
}
