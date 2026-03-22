import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
  const userSets = (setsData || []).filter(
    (s: any) => s.exercises?.workouts?.user_id === user.id,
  );

  // Total volume (kg)
  const totalVolume = userSets.reduce(
    (sum: number, s: any) => sum + (s.weight_kg || 0) * (s.reps || 0),
    0,
  );

  // Volume by muscle group (exercise name as proxy)
  const volumeByExercise: Record<string, number> = {};
  userSets.forEach((s: any) => {
    const name = s.exercises?.name || "Unknown";
    volumeByExercise[name] =
      (volumeByExercise[name] || 0) + (s.weight_kg || 0) * (s.reps || 0);
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

    (workoutsWithExercise || []).forEach((w: any) => {
      const matchingExercise = w.exercises?.find(
        (e: any) => e.name === topExerciseName,
      );
      if (!matchingExercise) return;

      const bestSet = (matchingExercise.sets || [])
        .filter((s: any) => s.completed)
        .sort((a: any, b: any) => (b.weight_kg || 0) - (a.weight_kg || 0))[0];

      if (bestSet) {
        strengthTrend.push({
          date: new Date(w.logged_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }),
          weight: bestSet.weight_kg,
        });
      }
    });
  }

  // Best lifts (max weight per exercise)
  const bestLifts: Record<string, number> = {};
  userSets.forEach((s: any) => {
    const name = s.exercises?.name || "Unknown";
    if (!bestLifts[name] || s.weight_kg > bestLifts[name]) {
      bestLifts[name] = s.weight_kg;
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
