import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";
import LogWorkoutForm from "./LogWorkoutForm";
import type { WorkoutExerciseData } from "@/lib/workout/types";

export const metadata = {
  title: "Log Workout",
};

type SearchParams = Record<string, string | string[] | undefined>;

function normalizeExercise(exercise: unknown): WorkoutExerciseData | null {
  if (
    typeof exercise !== "object" ||
    exercise === null ||
    Array.isArray(exercise)
  ) {
    return null;
  }

  const raw = exercise as Partial<WorkoutExerciseData>;
  const sets = Array.isArray(raw.sets)
    ? raw.sets
        .filter(
          (set): set is NonNullable<typeof set> =>
            typeof set === "object" && set !== null && !Array.isArray(set),
        )
        .map((set) => ({
          weight_kg: typeof set.weight_kg === "number" ? set.weight_kg : 0,
          reps: typeof set.reps === "number" ? set.reps : 10,
          rpe: typeof set.rpe === "number" ? set.rpe : 7,
          completed: false,
        }))
    : [];

  return {
    name: typeof raw.name === "string" ? raw.name : "",
    exerciseId: typeof raw.exerciseId === "string" ? raw.exerciseId : undefined,
    bodyPart: typeof raw.bodyPart === "string" ? raw.bodyPart : undefined,
    equipment: typeof raw.equipment === "string" ? raw.equipment : undefined,
    secondaryMuscles: Array.isArray(raw.secondaryMuscles)
      ? raw.secondaryMuscles.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
    instructions: Array.isArray(raw.instructions)
      ? raw.instructions.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
    sets:
      sets.length > 0
        ? sets
        : [{ weight_kg: 0, reps: 10, rpe: 7, completed: false }],
  };
}

export default async function LogWorkoutPage({
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

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const exerciseParam = resolvedSearchParams.exercise;
  const templateParam = resolvedSearchParams.template;
  const initialExerciseName =
    typeof exerciseParam === "string" ? exerciseParam : "";

  const templateId = typeof templateParam === "string" ? templateParam : "";
  if (templateId) {
    const { data: template } = await supabase
      .from("workout_templates")
      .select(
        "id, template_name, notes, set_rest_seconds, exercise_rest_seconds, exercises",
      )
      .eq("id", templateId)
      .eq("user_id", user.id)
      .eq("gym_id", gym.id)
      .single();

    if (!template) redirect("/dashboard/templates");

    const initialExercises = Array.isArray(template.exercises)
      ? template.exercises
          .map((exercise) => normalizeExercise(exercise))
          .filter(
            (exercise): exercise is WorkoutExerciseData => exercise !== null,
          )
      : [];

    return (
      <LogWorkoutForm
        gymId={gym.id}
        initialExerciseName={initialExerciseName}
        initialExercises={initialExercises}
        initialTemplateName={template.template_name}
        initialNotes={template.notes ?? ""}
        initialSetRestSeconds={template.set_rest_seconds}
        initialExerciseRestSeconds={template.exercise_rest_seconds}
      />
    );
  }

  return (
    <LogWorkoutForm gymId={gym.id} initialExerciseName={initialExerciseName} />
  );
}
