import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type WorkoutRow = {
  logged_at: string;
  exercises:
    | {
        name: string | null;
        sets:
          | {
              set_number: number | null;
              weight_kg: number | null;
              reps: number | null;
              completed: boolean | null;
            }[]
          | null;
      }[]
    | null;
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exercise = new URL(request.url).searchParams.get("exercise")?.trim();
  if (!exercise) {
    return NextResponse.json(
      { error: "exercise query param is required" },
      { status: 400 },
    );
  }
  const needle = exercise.toLowerCase();

  const { data, error } = await supabase
    .from("workouts")
    .select(
      "logged_at, exercises(name, sets(set_number, weight_kg, reps, completed))",
    )
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const workouts = (data ?? []) as WorkoutRow[];
  for (const workout of workouts) {
    const matching = (workout.exercises ?? []).find(
      (ex) => (ex.name ?? "").trim().toLowerCase() === needle,
    );
    if (!matching) continue;

    const sets = (matching.sets ?? [])
      .filter((s) => s.completed !== false)
      .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))
      .map((s) => ({
        weight_kg: s.weight_kg ?? 0,
        reps: s.reps ?? 0,
      }));

    return NextResponse.json({ sets });
  }

  return NextResponse.json({ sets: [] });
}
