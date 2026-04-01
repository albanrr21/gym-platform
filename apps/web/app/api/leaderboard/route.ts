import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getGym } from "@/lib/gym/getGym";

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
  const gymSets = (setsData || []).filter(
    (s: any) =>
      memberIds.includes(s.exercises?.workouts?.user_id) &&
      s.exercises?.workouts?.gym_id === gym.id,
  );

  // Get all workouts for this gym
  const { data: workoutsData } = await supabase
    .from("workouts")
    .select("user_id, logged_at")
    .eq("gym_id", gym.id)
    .in("user_id", memberIds);

  // Volume leaderboard
  const volumeMap: Record<string, number> = {};
  gymSets.forEach((s: any) => {
    const uid = s.exercises?.workouts?.user_id;
    if (!uid) return;
    volumeMap[uid] = (volumeMap[uid] || 0) + (s.weight_kg || 0) * (s.reps || 0);
  });

  // Consistency leaderboard (workouts this month)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const consistencyMap: Record<string, number> = {};
  (workoutsData || []).forEach((w: any) => {
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
