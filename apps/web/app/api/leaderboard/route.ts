import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getGym } from "@/lib/gym/getGym";

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type LeaderboardEmbeddedWorkout = {
  user_id: string | null;
  logged_at: string | null;
  gym_id: string | null;
};

type LeaderboardEmbeddedExercise = {
  workout_id: string | null;
  workouts: LeaderboardEmbeddedWorkout | LeaderboardEmbeddedWorkout[] | null;
};

type LeaderboardSetRow = {
  weight_kg: number | null;
  reps: number | null;
  completed: boolean | null;
  exercises: LeaderboardEmbeddedExercise | LeaderboardEmbeddedExercise[] | null;
};

type LeaderboardWorkoutRow = {
  user_id: string;
  logged_at: string;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gym = await getGym();
  if (!gym)
    return NextResponse.json({ error: "No gym found" }, { status: 400 });

  // Get all members in this gym
  const { data: members } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("gym_id", gym.id)
    .eq("role", "member");

  if (!members?.length) {
    return NextResponse.json({ volume: [], consistency: [] });
  }

  const memberIds = members.map((m) => m.id);

  // Get all completed sets for this gym
  const { data: setsData } = await supabase
    .from("sets")
    .select(
      `
      weight_kg,
      reps,
      completed,
      exercises (
        workout_id,
        workouts ( user_id, logged_at, gym_id )
      )
    `,
    )
    .eq("completed", true);

  // Filter to this gym's members only
  const typedSets = (setsData ?? []) as LeaderboardSetRow[];
  const gymSets = typedSets.filter((s) => {
    const exercise = pickOne<LeaderboardEmbeddedExercise>(s.exercises);
    const workout = pickOne<LeaderboardEmbeddedWorkout>(exercise?.workouts);
    const uid = workout?.user_id ?? null;
    const gid = workout?.gym_id ?? null;
    if (typeof uid !== "string") return false;
    return memberIds.includes(uid) && gid === gym.id;
  });

  // Get all workouts for this gym
  const { data: workoutsData } = await supabase
    .from("workouts")
    .select("user_id, logged_at")
    .eq("gym_id", gym.id)
    .in("user_id", memberIds);
  const typedWorkouts = (workoutsData ?? []) as LeaderboardWorkoutRow[];

  // Volume leaderboard
  const volumeMap: Record<string, number> = {};
  gymSets.forEach((s) => {
    const exercise = pickOne<LeaderboardEmbeddedExercise>(s.exercises);
    const uid =
      pickOne<LeaderboardEmbeddedWorkout>(exercise?.workouts)?.user_id ?? null;
    if (!uid) return;
    volumeMap[uid] = (volumeMap[uid] || 0) + (s.weight_kg ?? 0) * (s.reps ?? 0);
  });

  // Consistency leaderboard (workouts this month)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const consistencyMap: Record<string, number> = {};
  typedWorkouts.forEach((w) => {
    if (new Date(w.logged_at) >= monthStart) {
      consistencyMap[w.user_id] = (consistencyMap[w.user_id] || 0) + 1;
    }
  });

  // Build leaderboard arrays
  const getMemberName = (id: string) =>
    members.find((m) => m.id === id)?.full_name || "Unknown";

  const volumeLeaderboard = Object.entries(volumeMap)
    .map(([userId, volume]) => ({
      userId,
      name: getMemberName(userId),
      value: Math.round(volume),
      isCurrentUser: userId === user.id,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  const consistencyLeaderboard = Object.entries(consistencyMap)
    .map(([userId, count]) => ({
      userId,
      name: getMemberName(userId),
      value: count,
      isCurrentUser: userId === user.id,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return NextResponse.json({
    volume: volumeLeaderboard,
    consistency: consistencyLeaderboard,
    gymName: gym.name,
  });
}
