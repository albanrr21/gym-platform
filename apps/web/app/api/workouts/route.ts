import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { exercises, notes, gym_id } = await request.json();

  if (!exercises?.length) {
    return NextResponse.json(
      { error: "At least one exercise is required" },
      { status: 400 },
    );
  }

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({ user_id: user.id, gym_id, notes })
    .select()
    .single();

  if (workoutError)
    return NextResponse.json({ error: workoutError.message }, { status: 500 });

  for (const ex of exercises) {
    const { data: exercise, error: exError } = await supabase
      .from("exercises")
      .insert({
        gym_id,
        workout_id: workout.id,
        name: ex.name,
        sets: ex.sets.length,
        reps: ex.sets[0]?.reps ?? 0,
        weight_kg: ex.sets[0]?.weight_kg ?? 0,
        rpe: ex.sets[0]?.rpe ?? null,
      })
      .select()
      .single();

    if (exError)
      return NextResponse.json({ error: exError.message }, { status: 500 });

    const setRows = ex.sets.map((s: any, i: number) => ({
      gym_id,
      exercise_id: exercise.id,
      set_number: i + 1,
      weight_kg: s.weight_kg,
      reps: s.reps,
      rpe: s.rpe || null,
      completed: s.completed,
    }));

    const { error: setsError } = await supabase.from("sets").insert(setRows);
    if (setsError)
      return NextResponse.json({ error: setsError.message }, { status: 500 });
  }

  return NextResponse.json({ workout });
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
