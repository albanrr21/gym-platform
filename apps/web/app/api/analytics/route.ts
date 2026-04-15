import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type AnalyticsEmbeddedWorkout = {
  logged_at: string | null;
  user_id: string | null;
};

type AnalyticsEmbeddedExercise = {
  name: string | null;
  workout_id: string | null;
  workouts: AnalyticsEmbeddedWorkout | AnalyticsEmbeddedWorkout[] | null;
};

type AnalyticsSetRow = {
  weight_kg: number | null;
  reps: number | null;
  completed: boolean | null;
  exercises: AnalyticsEmbeddedExercise | AnalyticsEmbeddedExercise[] | null;
};

type AnalyticsWorkoutRow = {
  logged_at: string;
  exercises: {
    name: string | null;
    sets: {
      weight_kg: number | null;
      reps: number | null;
      completed: boolean | null;
    }[];
  }[];
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Total workouts
  const { count: totalWorkouts } = await supabase
    .from("workouts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // All sets with exercise info for volume calculations
  const { data: setsData } = await supabase
    .from("sets")
    .select(
      `
      weight_kg,
      reps,
      completed,
      exercises (
        name,
        workout_id,
        workouts ( logged_at, user_id )
      )
    `,
    )
    .eq("completed", true);

  // Filter to only this user's sets
  const typedSets = (setsData ?? []) as AnalyticsSetRow[];
  const userSets = typedSets.filter((s) => {
    const exercise = pickOne<AnalyticsEmbeddedExercise>(s.exercises);
    const workout = pickOne<AnalyticsEmbeddedWorkout>(exercise?.workouts);
    return workout?.user_id === user.id;
  });

  // Total volume (kg)
  const totalVolume = userSets.reduce(
    (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0),
    0,
  );

  // Volume by muscle group (exercise name as proxy)
  const volumeByExercise: Record<string, number> = {};
  userSets.forEach((s) => {
    const name =
      pickOne<AnalyticsEmbeddedExercise>(s.exercises)?.name ?? "Unknown";
    volumeByExercise[name] =
      (volumeByExercise[name] || 0) + (s.weight_kg ?? 0) * (s.reps ?? 0);
  });

  // Top 5 exercises by volume
  const topExercises = Object.entries(volumeByExercise)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, volume]) => ({ name, volume: Math.round(volume) }));

  // Workouts per week (last 8 weeks)
  const now = new Date();
  const weeksData: { week: string; count: number }[] = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const { count } = await supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("logged_at", weekStart.toISOString())
      .lt("logged_at", weekEnd.toISOString());

    weeksData.push({
      week: weekStart.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      count: count || 0,
    });
  }

  // Strength trend for top exercise (best set per workout)
  const strengthTrend: { date: string; weight: number }[] = [];
  if (topExercises.length > 0) {
    const topExerciseName = topExercises[0].name;

    const { data: workoutsWithExercise } = await supabase
      .from("workouts")
      .select(
        `
        logged_at,
        exercises (
          name,
          sets ( weight_kg, reps, completed )
        )
      `,
      )
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true })
      .limit(20);

    const typedWorkouts = (workoutsWithExercise ?? []) as AnalyticsWorkoutRow[];

    typedWorkouts.forEach((w) => {
      const matchingExercise = w.exercises?.find(
        (e) => e.name === topExerciseName,
      );
      if (!matchingExercise) return;

      const bestSet = (matchingExercise.sets || [])
        .filter((s) => Boolean(s.completed))
        .sort((a, b) => (b.weight_kg ?? 0) - (a.weight_kg ?? 0))[0];

      if (bestSet) {
        strengthTrend.push({
          date: new Date(w.logged_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }),
          weight: bestSet.weight_kg ?? 0,
        });
      }
    });
  }

  // Best lifts (max weight per exercise)
  const bestLifts: Record<string, number> = {};
  userSets.forEach((s) => {
    const name =
      pickOne<AnalyticsEmbeddedExercise>(s.exercises)?.name ?? "Unknown";
    const weight = s.weight_kg ?? 0;
    if (!bestLifts[name] || weight > bestLifts[name]) {
      bestLifts[name] = weight;
    }
  });

  const topBestLifts = Object.entries(bestLifts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, weight]) => ({ name, weight }));

  return NextResponse.json({
    totalWorkouts: totalWorkouts || 0,
    totalVolume: Math.round(totalVolume),
    topExercises,
    weeksData,
    strengthTrend,
    topExerciseName: topExercises[0]?.name || null,
    bestLifts: topBestLifts,
  });
}
