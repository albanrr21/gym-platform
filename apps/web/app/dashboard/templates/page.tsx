import Link from "next/link";
import { redirect } from "next/navigation";

import { getGym } from "@/lib/gym/getGym";
import { createClient } from "@/lib/supabase/server";

type WorkoutTemplateRow = {
  id: string;
  template_name: string;
  notes: string | null;
  set_rest_seconds: number;
  exercise_rest_seconds: number;
  exercises: unknown;
  created_at: string;
};

function countExercises(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function countSets(value: unknown) {
  if (!Array.isArray(value)) return 0;
  return value.reduce((total, exercise) => {
    if (typeof exercise !== "object" || exercise === null) return total;
    const sets = (exercise as { sets?: unknown }).sets;
    return total + (Array.isArray(sets) ? sets.length : 0);
  }, 0);
}

export default async function WorkoutTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const gym = await getGym();
  if (!gym) redirect("/login");

  const { data: templates, error } = await supabase
    .from("workout_templates")
    .select(
      "id, template_name, notes, set_rest_seconds, exercise_rest_seconds, exercises, created_at",
    )
    .eq("user_id", user.id)
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Workout Templates
        </h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const items = (templates ?? []) as WorkoutTemplateRow[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Workout Templates
          </h1>
          <p className="text-sm text-gray-500">
            Reuse a previous exercise structure and rest timer setup.
          </p>
        </div>
        <Link
          href="/dashboard/log"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          New log
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No templates saved yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((template) => {
            const exerciseCount = countExercises(template.exercises);
            const setCount = countSets(template.exercises);

            return (
              <div
                key={template.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {template.template_name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {exerciseCount} exercises, {setCount} sets
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Rest {template.set_rest_seconds}s between sets and{" "}
                      {template.exercise_rest_seconds}s between exercises
                    </p>
                    {template.notes && (
                      <p className="mt-2 text-sm text-gray-600">
                        {template.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/log?template=${template.id}`}
                      className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                    >
                      Use template
                    </Link>
                    <span className="text-xs text-gray-400">
                      {new Date(template.created_at).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
