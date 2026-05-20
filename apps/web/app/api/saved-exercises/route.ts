import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type SavedExerciseRow = {
  exercise_name: string;
  body_part: string | null;
  equipment: string | null;
};

type WorkoutExerciseSet = {
  weight_kg: number | null;
  reps: number | null;
  completed: boolean | null;
};

type WorkoutExerciseRow = {
  name: string | null;
  workouts: { user_id: string | null } | { user_id: string | null }[] | null;
  sets: WorkoutExerciseSet[] | null;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: saved } = await supabase
    .from("saved_exercises")
    .select("exercise_name, body_part, equipment")
    .eq("user_id", user.id);

  const savedMap = new Map<string, SavedExerciseRow>(
    ((saved ?? []) as SavedExerciseRow[]).map((row) => [
      row.exercise_name.toLowerCase(),
      row,
    ]),
  );

  const { data: exercises, error } = await supabase.from("exercises").select(`
      name,
      workouts!inner ( user_id ),
      sets ( weight_kg, reps, completed )
    `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stats = new Map<
    string,
    { times_logged: number; best_weight: number; total_volume: number }
  >();

  ((exercises ?? []) as WorkoutExerciseRow[]).forEach((row) => {
    const owner = pickOne(row.workouts);
    const name = (row.name ?? "").trim();
    if (!name || owner?.user_id !== user.id) return;

    const key = name.toLowerCase();
    const current = stats.get(key) ?? {
      times_logged: 0,
      best_weight: 0,
      total_volume: 0,
    };

    current.times_logged += 1;
    (row.sets ?? []).forEach((set) => {
      if (set.completed === false) return;
      const weight = set.weight_kg ?? 0;
      const reps = set.reps ?? 0;
      current.best_weight = Math.max(current.best_weight, weight);
      current.total_volume += weight * reps;
    });
    stats.set(key, current);
  });

  const items = Array.from(stats.entries())
    .map(([key, value]) => {
      const canonicalName =
        (exercises as WorkoutExerciseRow[]).find(
          (x) => (x.name ?? "").toLowerCase() === key,
        )?.name ?? key;
      const savedEntry = savedMap.get(key);
      return {
        name: canonicalName,
        body_part: savedEntry?.body_part ?? "",
        equipment: savedEntry?.equipment ?? "",
        times_logged: value.times_logged,
        best_weight: value.best_weight,
        total_volume: Math.round(value.total_volume),
        saved: Boolean(savedEntry),
      };
    })
    .sort((a, b) => b.times_logged - a.times_logged);

  return NextResponse.json({ exercises: items });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id")
    .eq("id", user.id)
    .single();
  if (!profile?.gym_id) {
    return NextResponse.json({ error: "No gym found" }, { status: 400 });
  }

  const payload = (await request.json()) as {
    name?: string;
    body_part?: string;
    equipment?: string;
  };
  const name = payload.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Exercise name is required." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("saved_exercises").upsert(
    {
      gym_id: profile.gym_id,
      user_id: user.id,
      exercise_name: name,
      body_part: payload.body_part?.trim() || null,
      equipment: payload.equipment?.trim() || null,
    },
    { onConflict: "user_id,exercise_name" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Exercise name is required." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("saved_exercises")
    .delete()
    .eq("user_id", user.id)
    .ilike("exercise_name", name);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
