import { createClient } from "@/lib/supabase/server";

type AggregatedSetRow = {
  set_number: number | null;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean | null;
};

type AggregatedExerciseRow = {
  id: string;
  name: string;
  sets: AggregatedSetRow[];
};

type AggregatedWorkoutRow = {
  id: string;
  logged_at: string;
  notes: string | null;
  exercises: AggregatedExerciseRow[];
};

export async function aggregateWorkoutData(userId: string) {
  const supabase = await createClient();

  // Get last 4 weeks of workouts with exercises and sets
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data: workoutsData } = await supabase
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

  const workouts = (workoutsData ?? []) as AggregatedWorkoutRow[];
  if (!workouts.length) return null;

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

    workout.exercises.forEach((exercise) => {
      const completedSets = exercise.sets.filter((s) => Boolean(s.completed));
      if (!completedSets.length) return;

      const maxWeight = Math.max(...completedSets.map((s) => s.weight_kg ?? 0));
      const totalVolume = completedSets.reduce(
        (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0),
        0,
      );
      const rpeSets = completedSets.filter((s) => Boolean(s.rpe));
      const avgRpe = rpeSets.length
        ? rpeSets.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / rpeSets.length
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

  function calcVolume(ws: AggregatedWorkoutRow[]) {
    return ws.reduce((sum, w) => {
      return (
        sum +
        w.exercises.reduce((eSum, e) => {
          return (
            eSum +
            e.sets
              .filter((s) => Boolean(s.completed))
              .reduce((sSum, s) => sSum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
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
    w.exercises.forEach((e) => {
      e.sets
        .filter((s) => Boolean(s.completed) && Boolean(s.rpe))
        .forEach((s) => recentRpes.push(s.rpe ?? 0));
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
