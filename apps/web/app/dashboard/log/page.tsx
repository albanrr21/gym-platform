import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";
import LogWorkoutForm from "./LogWorkoutForm";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function LogWorkoutPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const gym = await getGym();
  if (!gym) redirect("/login");

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const exerciseParam = resolvedSearchParams.exercise;
  const initialExerciseName =
    typeof exerciseParam === "string" ? exerciseParam : "";

  return (
    <LogWorkoutForm gymId={gym.id} initialExerciseName={initialExerciseName} />
  );
}
