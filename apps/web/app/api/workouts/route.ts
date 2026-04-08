import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface WorkoutSetInput {
  weight_kg: number;
  reps: number;
  rpe: number | null;
  completed: boolean;
}

interface WorkoutExerciseInput {
  name: string;
  sets: WorkoutSetInput[];
}

interface WorkoutPayload {
  gym_id: string;
  notes: string | null;
  exercises: WorkoutExerciseInput[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_EXERCISES = 30;
const MAX_SETS_PER_EXERCISE = 20;
const MAX_NOTES_LENGTH = 2000;
const RPC_VALIDATION_ERROR_CODES = new Set(["22023", "22P02", "23514", "P0001"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseWorkoutPayload(payload: unknown):
  | { ok: true; data: WorkoutPayload }
  | { ok: false; error: string } {
  if (!isRecord(payload)) {
    return { ok: false, error: "Invalid payload" };
  }

  const rawGymId = payload.gym_id;
  if (typeof rawGymId !== "string" || !UUID_PATTERN.test(rawGymId)) {
    return { ok: false, error: "A valid gym_id is required" };
  }

  const rawNotes = payload.notes;
  let notes: string | null = null;
  if (typeof rawNotes === "string") {
    notes = rawNotes.trim();
    if (notes.length > MAX_NOTES_LENGTH) {
      return {
        ok: false,
        error: `Notes are too long (max ${MAX_NOTES_LENGTH} characters)`,
      };
    }
  } else if (rawNotes !== undefined && rawNotes !== null) {
    return { ok: false, error: "Notes must be a string or null" };
  }

  const rawExercises = payload.exercises;
  if (!Array.isArray(rawExercises) || rawExercises.length === 0) {
    return { ok: false, error: "At least one exercise is required" };
  }
  if (rawExercises.length > MAX_EXERCISES) {
    return { ok: false, error: `Too many exercises (max ${MAX_EXERCISES})` };
  }

  const exercises: WorkoutExerciseInput[] = [];

  for (let exerciseIndex = 0; exerciseIndex < rawExercises.length; exerciseIndex++) {
    const rawExercise = rawExercises[exerciseIndex];
    if (!isRecord(rawExercise)) {
      return { ok: false, error: `Exercise ${exerciseIndex + 1} is invalid` };
    }

    const rawName = rawExercise.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) {
      return {
        ok: false,
        error: `Exercise ${exerciseIndex + 1} must have a name`,
      };
    }
    if (name.length > 120) {
      return {
        ok: false,
        error: `Exercise ${exerciseIndex + 1} name is too long`,
      };
    }

    const rawSets = rawExercise.sets;
    if (!Array.isArray(rawSets) || rawSets.length === 0) {
      return {
        ok: false,
        error: `Exercise ${exerciseIndex + 1} must contain at least one set`,
      };
    }
    if (rawSets.length > MAX_SETS_PER_EXERCISE) {
      return {
        ok: false,
        error: `Exercise ${exerciseIndex + 1} has too many sets (max ${MAX_SETS_PER_EXERCISE})`,
      };
    }

    const sets: WorkoutSetInput[] = [];

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

  return {
    ok: true,
    data: {
      gym_id: rawGymId,
      notes,
      exercises,
    },
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsedPayload = parseWorkoutPayload(payload);
  if (!parsedPayload.ok) {
    return NextResponse.json({ error: parsedPayload.error }, { status: 400 });
  }
  const parsedData = parsedPayload.data;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("gym_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.gym_id) {
    return NextResponse.json(
      { error: "Authenticated user is not assigned to a gym" },
      { status: 400 },
    );
  }

  if (parsedData.gym_id !== profile.gym_id) {
    return NextResponse.json(
      { error: "Gym mismatch for authenticated user" },
      { status: 403 },
    );
  }

  const { data: workoutId, error: workoutError } = await supabase.rpc(
    "log_workout_with_sets",
    {
      p_gym_id: profile.gym_id,
      p_notes: parsedData.notes,
      p_exercises: parsedData.exercises,
    },
  );

  if (workoutError) {
    if (workoutError.code === "42883") {
      return NextResponse.json(
        {
          error:
            "Database is missing log_workout_with_sets. Apply the latest Supabase migrations.",
        },
        { status: 500 },
      );
    }

    const status = RPC_VALIDATION_ERROR_CODES.has(workoutError.code ?? "")
      ? 400
      : 500;
    return NextResponse.json({ error: workoutError.message }, { status });
  }

  return NextResponse.json({ workout: { id: workoutId } });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select(
      `
      id, notes, logged_at,
      exercises (
        id, name,
        sets ( id, set_number, weight_kg, reps, rpe, completed )
      )
    `,
    )
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(10);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workouts });
}
