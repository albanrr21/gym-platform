import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

type WorkoutExercisePreview = {
  id: string;
  name: string;
  sets:
    | {
        id: string;
        set_number: number | null;
        weight_kg: number | null;
        reps: number | null;
        rpe: number | null;
        completed: boolean | null;
      }[]
    | null;
};

function coerceExercises(value: unknown): WorkoutExercisePreview[] {
  if (!Array.isArray(value)) return [];
  return value as WorkoutExercisePreview[];
}

type WorkoutPreview = {
  id: string;
  notes: string | null;
  logged_at: string;
  exercises: WorkoutExercisePreview[] | null;
};

function formatWorkoutDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCompletedSets(exercise: WorkoutExercisePreview) {
  return Array.isArray(exercise.sets)
    ? exercise.sets.filter((set) => set.completed !== false)
    : [];
}

function getWorkoutVolume(workout: WorkoutPreview) {
  return coerceExercises(workout.exercises).reduce((sum, exercise) => {
    return (
      sum +
      getCompletedSets(exercise).reduce(
        (inner, set) => inner + (set.weight_kg ?? 0) * (set.reps ?? 0),
        0,
      )
    );
  }, 0);
}

function getCurrentStreak(loggedAtValues: string[]) {
  const workoutDays = new Set(
    loggedAtValues.map((value) => new Date(value).toISOString().slice(0, 10)),
  );
  if (workoutDays.size === 0) return 0;

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;

  while (workoutDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
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
      exercises (
        id,
        name,
        sets ( id, set_number, weight_kg, reps, rpe, completed )
      )
    `,
    )
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(5);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthWorkouts } = await supabase
    .from("workouts")
    .select(
      `
      id,
      logged_at,
      exercises (
        id,
        name,
        sets ( id, set_number, weight_kg, reps, rpe, completed )
      )
    `,
    )
    .eq("user_id", user.id)
    .gte("logged_at", monthStart.toISOString());

  const { data: workoutDates } = await supabase
    .from("workouts")
    .select("logged_at")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(365);

  const recentWorkouts = (workouts ?? []) as WorkoutPreview[];
  const typedMonthWorkouts = (monthWorkouts ?? []) as WorkoutPreview[];
  const monthVolume = typedMonthWorkouts.reduce(
    (sum, workout) => sum + getWorkoutVolume(workout),
    0,
  );
  const loggedAtValues = (workoutDates ?? [])
    .map((workout) => workout.logged_at)
    .filter((value): value is string => Boolean(value));
  const currentStreak = getCurrentStreak(loggedAtValues);
  const lastSessionDate = loggedAtValues[0]
    ? formatWorkoutDate(loggedAtValues[0])
    : "No sessions";

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const savedParam = resolvedSearchParams.saved;
  const saved = typeof savedParam === "string" ? savedParam : null;

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {saved === "workout" && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            <p className="text-sm font-medium">Workout saved.</p>
            <Link
              href="/dashboard"
              className="text-sm text-green-800/80 hover:text-green-900 underline underline-offset-2"
            >
              Dismiss
            </Link>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">{gym.name}</p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome, {profile?.full_name ?? user.email}
            </h1>
          </div>
          <Link
            href="/dashboard/log"
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            + Log Workout
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">
              Workouts this month
            </p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {typedMonthWorkouts.length}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">
              Volume this month
            </p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {monthVolume >= 1000
                ? `${(monthVolume / 1000).toFixed(1)}k`
                : Math.round(monthVolume)}
              <span className="ml-1 text-sm font-normal text-gray-400">kg</span>
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Current streak</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {currentStreak}
              <span className="ml-1 text-sm font-normal text-gray-400">
                day{currentStreak === 1 ? "" : "s"}
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Last session</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {lastSessionDate}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Link
            href="/dashboard/log"
            className="rounded-xl bg-black p-5 text-white transition-colors hover:bg-gray-800"
          >
            <p className="text-sm font-semibold">Log Workout</p>
            <p className="mt-2 text-sm text-white/70">
              Capture sets, RPE, notes, and rest timing.
            </p>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:bg-gray-50"
          >
            <p className="text-sm font-semibold text-gray-900">View Progress</p>
            <p className="mt-2 text-sm text-gray-500">
              Review volume, weekly frequency, and strength trends.
            </p>
          </Link>
          <Link
            href="/dashboard/ai-report"
            className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:bg-gray-50"
          >
            <p className="text-sm font-semibold text-gray-900">AI Report</p>
            <p className="mt-2 text-sm text-gray-500">
              Generate fatigue, plateau, and progression guidance.
            </p>
          </Link>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-gray-500">
              Recent Workouts
            </h2>
            <Link
              href="/dashboard/history"
              className="text-sm font-medium text-gray-700 hover:text-gray-950"
            >
              View all
            </Link>
          </div>

          {!recentWorkouts.length ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
              <p className="text-base font-semibold text-gray-900">
                Start your training log
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                Track your first workout to unlock progress charts, previous set
                hints, and AI recommendations.
              </p>
              <Link
                href="/dashboard/log"
                className="mt-5 inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Log your first workout
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {recentWorkouts.map((workout) => {
                const exercises = coerceExercises(workout.exercises);
                const totalVolume = getWorkoutVolume(workout);

                return (
                  <Link
                    key={workout.id}
                    href={`/dashboard/workouts/${workout.id}`}
                    className="block rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {exercises.length} exercise
                        {exercises.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatWorkoutDate(workout.logged_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {exercises.map((ex) => {
                        const sets = Array.isArray(ex.sets)
                          ? ex.sets.filter((set) => set.completed !== false)
                          : [];
                        const bestWeight = sets.reduce(
                          (max, set) => Math.max(max, set.weight_kg ?? 0),
                          0,
                        );
                        const topReps = sets.reduce(
                          (max, set) => Math.max(max, set.reps ?? 0),
                          0,
                        );

                        return (
                          <span
                            key={ex.id}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                          >
                            {ex.name} - {sets.length}x{topReps} @ {bestWeight}{" "}
                            kg
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white">
                        {Math.round(totalVolume).toLocaleString()} kg volume
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        View details &gt;
                      </span>
                    </div>

                    {workout.notes && (
                      <p className="mt-3 line-clamp-2 text-xs italic text-gray-400">
                        {workout.notes}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
