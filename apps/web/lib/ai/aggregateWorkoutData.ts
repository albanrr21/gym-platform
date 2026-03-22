import { createClient } from "@/lib/supabase/server";

export async function aggregateWorkoutData(userId: string) {
  const supabase = await createClient();

  // Get last 4 weeks of workouts with exercises and sets
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data: workouts } = await supabase
    .from("workouts")
    .select(
      `
      id,
      logged_at,
      notes,
      exercises (
        id,
        name,
        sets (
          set_number,
          weight_kg,
          reps,
          rpe,
          completed
        )
      )
    `,
    )
    .eq("user_id", userId)
    .gte("logged_at", fourWeeksAgo.toISOString())
    .order("logged_at", { ascending: false });

  if (!workouts?.length) return null;

  // Per exercise stats
  const exerciseMap: Record<
    string,
    {
      name: string;
      sessions: {
        date: string;
        maxWeight: number;
        totalVolume: number;
        avgRpe: number;
      }[];
    }
  > = {};

  workouts.forEach((workout) => {
    const date = new Date(workout.logged_at).toISOString().split("T")[0];

    (workout.exercises as any[]).forEach((exercise) => {
      const completedSets = (exercise.sets as any[]).filter((s) => s.completed);
      if (!completedSets.length) return;

      const maxWeight = Math.max(...completedSets.map((s) => s.weight_kg || 0));
      const totalVolume = completedSets.reduce(
        (sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0),
        0,
      );
      const rpeSets = completedSets.filter((s) => s.rpe);
      const avgRpe = rpeSets.length
        ? rpeSets.reduce((sum, s) => sum + s.rpe, 0) / rpeSets.length
        : 0;

      if (!exerciseMap[exercise.name]) {
        exerciseMap[exercise.name] = { name: exercise.name, sessions: [] };
      }

      exerciseMap[exercise.name].sessions.push({
        date,
        maxWeight,
        totalVolume: Math.round(totalVolume),
        avgRpe: Math.round(avgRpe * 10) / 10,
      });
    });
  });

  // Weekly volume
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 14);

  const thisWeekWorkouts = workouts.filter(
    (w) => new Date(w.logged_at) >= thisWeekStart,
  );
  const lastWeekWorkouts = workouts.filter(
    (w) =>
      new Date(w.logged_at) >= lastWeekStart &&
      new Date(w.logged_at) < thisWeekStart,
  );

  function calcVolume(ws: any[]) {
    return ws.reduce((sum, w) => {
      return (
        sum +
        (w.exercises as any[]).reduce((eSum: number, e: any) => {
          return (
            eSum +
            (e.sets as any[])
              .filter((s: any) => s.completed)
              .reduce(
                (sSum: number, s: any) =>
                  sSum + (s.weight_kg || 0) * (s.reps || 0),
                0,
              )
          );
        }, 0)
      );
    }, 0);
  }

  const thisWeekVolume = Math.round(calcVolume(thisWeekWorkouts));
  const lastWeekVolume = Math.round(calcVolume(lastWeekWorkouts));

  // Recent RPE across all exercises (last 3 sessions)
  const recentSessions = workouts.slice(0, 3);
  const recentRpes: number[] = [];
  recentSessions.forEach((w) => {
    (w.exercises as any[]).forEach((e) => {
      (e.sets as any[])
        .filter((s: any) => s.completed && s.rpe)
        .forEach((s: any) => recentRpes.push(s.rpe));
    });
  });
  const avgRecentRpe = recentRpes.length
    ? Math.round(
        (recentRpes.reduce((a, b) => a + b, 0) / recentRpes.length) * 10,
      ) / 10
    : null;

  return {
    totalWorkoutsLast4Weeks: workouts.length,
    thisWeekWorkouts: thisWeekWorkouts.length,
    lastWeekWorkouts: lastWeekWorkouts.length,
    thisWeekVolume,
    lastWeekVolume,
    avgRecentRpe,
    exercises: Object.values(exerciseMap),
  };
}
