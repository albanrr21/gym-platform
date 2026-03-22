import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { aggregateWorkoutData } from "@/lib/ai/aggregateWorkoutData";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id")
    .eq("id", user.id)
    .single();

  if (!profile?.gym_id) {
    return NextResponse.json({ error: "No gym found" }, { status: 400 });
  }

  // Aggregate workout data
  const workoutData = await aggregateWorkoutData(user.id);

  if (!workoutData) {
    return NextResponse.json(
      {
        error:
          "Not enough workout data to generate a report. Log at least one workout first.",
      },
      { status: 400 },
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
You are an elite gym performance AI. Analyze the following workout data and return a JSON report.

WORKOUT DATA:
${JSON.stringify(workoutData, null, 2)}

Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "fatigue": {
    "status": "ok" | "at_risk" | "high",
    "message": "brief analysis of fatigue based on RPE trends",
    "recommendation": "specific actionable advice"
  },
  "plateau": {
    "detected": true | false,
    "exercise": "exercise name or null",
    "weeks_stalled": number or null,
    "recommendation": "specific actionable advice or null"
  },
  "progression": [
    {
      "exercise": "exercise name",
      "current_max_kg": number,
      "suggested_next_kg": number,
      "reasoning": "brief reason"
    }
  ],
  "weekly_summary": {
    "total_volume_kg": number,
    "vs_last_week": "percentage change as string e.g. +12% or -5% or no data",
    "sessions_this_week": number,
    "highlight": "one positive observation about their training"
  }
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    });

    const rawResponse = completion.choices[0].message.content || "";

    // Parse JSON — strip any markdown fences if present
    const clean = rawResponse.replace(/```json|```/g, "").trim();
    const report = JSON.parse(clean);

    // Store in ai_reports table
    await supabase.from("ai_reports").insert({
      user_id: user.id,
      gym_id: profile.gym_id,
      report_type: "weekly_summary",
      payload: report,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("AI report error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get most recent report
  const { data: report } = await supabase
    .from("ai_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ report: report?.payload || null });
}
