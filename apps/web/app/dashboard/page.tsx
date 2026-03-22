import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import Link from "next/link";

export default async function DashboardPage() {
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
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
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="bg-white border border-gray-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {(workout.exercises as any[]).length} exercise
                      {(workout.exercises as any[]).length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(workout.logged_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(workout.exercises as any[]).map((ex) => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
