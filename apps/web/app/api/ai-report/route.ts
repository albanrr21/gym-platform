import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { aggregateWorkoutData } from "@/lib/ai/aggregateWorkoutData";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(`ai-report:${user.id}`, 3, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set" },
      { status: 500 },
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id")
    .eq("id", user.id)
    .single();

  if (!profile?.gym_id) {
    return NextResponse.json({ error: "No gym found" }, { status: 400 });
  }

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
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
      stream: true,
    });

    const encoder = new TextEncoder();
    let fullText = "";

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const token = chunk.choices[0]?.delta?.content ?? "";
              if (!token) continue;
              fullText += token;
              controller.enqueue(encoder.encode(token));
            }

            const clean = fullText.replace(/```json|```/g, "").trim();
            const report = JSON.parse(clean);

            await supabase.from("ai_reports").insert({
              user_id: user.id,
              gym_id: profile.gym_id,
              report_type: "weekly_summary",
              payload: report,
            });

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      }),
      { headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
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

  const { data: report } = await supabase
    .from("ai_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ report: report?.payload || null });
}