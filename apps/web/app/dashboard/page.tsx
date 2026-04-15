import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

type WorkoutExercisePreview = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
};

function coerceExercises(value: unknown): WorkoutExercisePreview[] {
  if (!Array.isArray(value)) return [];
  return value as WorkoutExercisePreview[];
}

export default async function DashboardPage({
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

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: workouts } = await supabase
    .from("workouts")
    .select(
      `
      id,
      notes,
      logged_at,
      exercises ( id, name, sets, reps, weight_kg, rpe )
    `,
    )
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(5);

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const savedParam = resolvedSearchParams.saved;
  const saved = typeof savedParam === "string" ? savedParam : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {saved === "workout" && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <p className="text-sm font-medium">Workout saved.</p>
            <Link
              href="/dashboard"
              className="text-sm text-green-800/80 hover:text-green-900 underline underline-offset-2"
            >
              Dismiss
            </Link>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-gray-500">{gym.name}</p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome, {profile?.full_name ?? user.email}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LogoutButton />
            <Link
              href="/dashboard/log"
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              + Log Workout
            </Link>
          </div>
        </div>
        {/* Quick links */}
        <div className="flex gap-2 mb-6">
          <Link
            href="/dashboard/analytics"
            className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Progress →
          </Link>
          <Link
            href="/dashboard/ai-report"
            className="text-sm px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            AI Report →
          </Link>
          <Link
            href="/dashboard/leaderboard"
            className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Leaderboard →
          </Link>
        </div>
        {/* Recent workouts */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            Recent Workouts
          </h2>

          {!workouts?.length ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400">No workouts logged yet.</p>
              <Link
                href="/dashboard/log"
                className="inline-block mt-3 text-sm font-medium text-black hover:underline"
              >
                Log your first workout →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {workouts.map((workout) => {
                const exercises = coerceExercises(workout.exercises);

                return (
                  <div
                    key={workout.id}
                    className="bg-white border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {exercises.length} exercise
                        {exercises.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(workout.logged_at).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {exercises.map((ex) => (
                        <span
                          key={ex.id}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                        >
                          {ex.name} — {ex.sets}×{ex.reps} @ {ex.weight_kg}kg
                        </span>
                      ))}
                    </div>

                    {workout.notes && (
                      <p className="text-xs text-gray-400 mt-2 italic">
                        {workout.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
