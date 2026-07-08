type PrSet = {
  weight_kg: number | null;
  reps: number | null;
  completed: boolean | null;
};

type PrExercise = {
  name: string | null;
  sets: PrSet[] | null;
};

export type PrWorkoutRow = {
  logged_at: string;
  exercises: PrExercise[] | null;
};

export type PersonalRecord = {
  exercise: string;
  weight_kg: number;
  logged_at: string;
};

function completedSets(exercise: PrExercise) {
  return (exercise.sets ?? []).filter((set) => set.completed !== false);
}

/** All-time best completed weight per exercise (keyed by lowercased name). */
export function computeBestWeights(rows: PrWorkoutRow[]) {
  const best: Record<string, number> = {};
  for (const row of rows) {
    for (const exercise of row.exercises ?? []) {
      const name = (exercise.name ?? "").trim().toLowerCase();
      if (!name) continue;
      for (const set of completedSets(exercise)) {
        const weight = set.weight_kg ?? 0;
        if (weight > (best[name] ?? 0)) best[name] = weight;
      }
    }
  }
  return best;
}

/**
 * Walk workouts chronologically and record every time an exercise's best
 * completed weight was beaten. The first session for an exercise sets the
 * baseline and is not counted as a PR.
 */
export function computeRecentPrs(
  rows: PrWorkoutRow[],
  sinceDays: number,
): PersonalRecord[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
  );

  const runningBest: Record<string, number> = {};
  const prs: PersonalRecord[] = [];

  for (const row of sorted) {
    for (const exercise of row.exercises ?? []) {
      const name = (exercise.name ?? "").trim().toLowerCase();
      if (!name) continue;

      const topWeight = completedSets(exercise).reduce(
        (max, set) => Math.max(max, set.weight_kg ?? 0),
        0,
      );
      if (topWeight <= 0) continue;

      const previousBest = runningBest[name];
      if (previousBest !== undefined && topWeight > previousBest) {
        prs.push({
          exercise: name,
          weight_kg: topWeight,
          logged_at: row.logged_at,
        });
      }
      runningBest[name] = Math.max(previousBest ?? 0, topWeight);
    }
  }

  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
  return prs
    .filter((pr) => new Date(pr.logged_at).getTime() >= cutoff)
    .reverse();
}
