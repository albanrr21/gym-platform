import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type TemplateSetInput = {
  weight_kg: number;
  reps: number;
  rpe: number | null;
  completed: boolean;
};

type TemplateExerciseInput = {
  name: string;
  sets: TemplateSetInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseTemplateExercises(
  value: unknown,
): { ok: true; data: TemplateExerciseInput[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "At least one exercise is required" };
  }

  const exercises: TemplateExerciseInput[] = [];

  for (let exerciseIndex = 0; exerciseIndex < value.length; exerciseIndex++) {
    const rawExercise = value[exerciseIndex];
    if (!isRecord(rawExercise)) {
      return { ok: false, error: `Exercise ${exerciseIndex + 1} is invalid` };
    }

    const name =
      typeof rawExercise.name === "string" ? rawExercise.name.trim() : "";
    if (!name) {
      return {
        ok: false,
        error: `Exercise ${exerciseIndex + 1} must have a name`,
      };
    }

    const rawSets = rawExercise.sets;
    if (!Array.isArray(rawSets) || rawSets.length === 0) {
      return {
        ok: false,
        error: `Exercise ${exerciseIndex + 1} must contain at least one set`,
      };
    }

    const sets: TemplateSetInput[] = [];

    for (let setIndex = 0; setIndex < rawSets.length; setIndex++) {
      const rawSet = rawSets[setIndex];
      if (!isRecord(rawSet)) {
        return {
          ok: false,
          error: `Exercise ${exerciseIndex + 1}, set ${setIndex + 1} is invalid`,
        };
      }

      const weight = rawSet.weight_kg;
      if (!isFiniteNumber(weight) || weight < 0 || weight > 2000) {
        return {
          ok: false,
          error: `Exercise ${exerciseIndex + 1}, set ${setIndex + 1} has invalid weight_kg`,
        };
      }

      const reps = rawSet.reps;
      if (
        !isFiniteNumber(reps) ||
        !Number.isInteger(reps) ||
        reps < 0 ||
        reps > 1000
      ) {
        return {
          ok: false,
          error: `Exercise ${exerciseIndex + 1}, set ${setIndex + 1} has invalid reps`,
        };
      }

      const completed = rawSet.completed;
      if (typeof completed !== "boolean") {
        return {
          ok: false,
          error: `Exercise ${exerciseIndex + 1}, set ${setIndex + 1} must include completed as true/false`,
        };
      }

      const rawRpe = rawSet.rpe;
      let rpe: number | null = null;
      if (rawRpe !== undefined && rawRpe !== null) {
        if (!isFiniteNumber(rawRpe) || rawRpe < 1 || rawRpe > 10) {
          return {
            ok: false,
            error: `Exercise ${exerciseIndex + 1}, set ${setIndex + 1} has invalid rpe`,
          };
        }
        rpe = rawRpe;
      }

      sets.push({
        weight_kg: weight,
        reps,
        rpe,
        completed,
      });
    }

    exercises.push({
      name,
      sets,
    });
  }

  return { ok: true, data: exercises };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("gym_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.gym_id) {
    return NextResponse.json({ error: "No gym found" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const templateName =
    typeof payload.name === "string" ? payload.name.trim() : "";
  const resolvedTemplateName = templateName || "Workout template";
  if (resolvedTemplateName.length > 120) {
    return NextResponse.json(
      { error: "Template name is too long" },
      { status: 400 },
    );
  }

  const notes =
    typeof payload.notes === "string"
      ? payload.notes.trim() || null
      : payload.notes == null
        ? null
        : undefined;
  if (notes === undefined) {
    return NextResponse.json(
      { error: "Notes must be a string or null" },
      { status: 400 },
    );
  }

  const setRestSeconds = payload.set_rest_seconds ?? 90;
  const exerciseRestSeconds = payload.exercise_rest_seconds ?? 180;
  if (
    !isFiniteNumber(setRestSeconds) ||
    !Number.isInteger(setRestSeconds) ||
    setRestSeconds < 0 ||
    setRestSeconds > 3600 ||
    !isFiniteNumber(exerciseRestSeconds) ||
    !Number.isInteger(exerciseRestSeconds) ||
    exerciseRestSeconds < 0 ||
    exerciseRestSeconds > 7200
  ) {
    return NextResponse.json(
      { error: "Invalid rest timer values" },
      { status: 400 },
    );
  }

  const parsedExercises = parseTemplateExercises(payload.exercises);
  if (!parsedExercises.ok) {
    return NextResponse.json({ error: parsedExercises.error }, { status: 400 });
  }

  const { data: template, error } = await supabase
    .from("workout_templates")
    .insert({
      gym_id: profile.gym_id,
      user_id: user.id,
      template_name: resolvedTemplateName,
      notes,
      set_rest_seconds: setRestSeconds,
      exercise_rest_seconds: exerciseRestSeconds,
      exercises: parsedExercises.data,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, template });
}
