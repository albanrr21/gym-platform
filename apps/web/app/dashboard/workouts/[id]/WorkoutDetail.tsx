import Link from "next/link";

type WorkoutSet = {
  set_number: number | null;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean | null;
};

type WorkoutExercise = {
  id: string;
  name: string;
  sets: WorkoutSet[] | null;
};

type Workout = {
  id: string;
  logged_at: string;
  notes: string | null;
  exercises: WorkoutExercise[] | null;
};

export default function WorkoutDetail({ workout }: { workout: Workout }) {
  const exercises = workout.exercises ?? [];
  const totalVolume = exercises.reduce((sum, exercise) => {
    const sets = exercise.sets ?? [];
    return (
      sum +
      sets.reduce(
        (inner, set) => inner + (set.weight_kg ?? 0) * (set.reps ?? 0),
        0,
      )
    );
  }, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-sm text-gray-600 hover:text-gray-900"
      >
        Back to Dashboard
      </Link>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Workout Detail</h1>
          <span className="text-sm text-gray-500">
            {new Date(workout.logged_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        {workout.notes && <p className="mb-4 text-sm text-gray-600">{workout.notes}</p>}
        <p className="mb-5 text-sm font-medium text-gray-800">
          Total volume: {Math.round(totalVolume)} kg
        </p>

        <div className="space-y-4">
          {exercises.map((exercise) => (
            <div key={exercise.id} className="rounded-xl border border-gray-200 p-4">
              <h2 className="mb-3 text-base font-semibold text-gray-900">
                {exercise.name}
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2 pr-4">Set #</th>
                      <th className="pb-2 pr-4">Weight (kg)</th>
                      <th className="pb-2 pr-4">Reps</th>
                      <th className="pb-2 pr-4">RPE</th>
                      <th className="pb-2">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(exercise.sets ?? []).map((set, index) => (
                      <tr key={`${exercise.id}-${index}`} className="border-t border-gray-100">
                        <td className="py-2 pr-4">{set.set_number ?? index + 1}</td>
                        <td className="py-2 pr-4">{set.weight_kg ?? 0}</td>
                        <td className="py-2 pr-4">{set.reps ?? 0}</td>
                        <td className="py-2 pr-4">{set.rpe ?? "-"}</td>
                        <td className="py-2">{set.completed ? "Yes" : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
