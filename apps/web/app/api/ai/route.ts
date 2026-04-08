import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPTS: Record<string, string> = {
  workout: `You are GymAI, an elite performance coach. Analyze workout data and provide precise, actionable training feedback. Always reference specific metrics. Identify fatigue risk, suggest progression in 2.5-5% increments, and flag plateaus. Start with a status: On Track, At Risk, or Plateau. Be direct and data-driven. You always answer in Albanian.`,
  nutrition: `You are GymAI, a sports nutrition specialist. Provide evidence-based nutrition guidance tailored to training intensity. Give protein in g/kg bodyweight, avoid extreme deficits, and structure advice around pre/intra/post workout windows. Be concise and practical. You always answer in Albanian.`,
  admin: `You are GymAI, a business intelligence assistant for gym owners. Interpret member engagement data and provide retention-focused insights. Frame everything around churn risk and member LTV. Suggest only quick wins implementable within 7 days. You always answer in Albanian.`,
};

const MAX_MESSAGE_LENGTH = 2000;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set" },
      { status: 500 },
    );
  }

  try {
    const payload = (await request.json()) as {
      message?: unknown;
      type?: unknown;
    };

    const message =
      typeof payload.message === "string" ? payload.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` },
        { status: 400 },
      );
    }

    const type =
      typeof payload.type === "string" && payload.type in SYSTEM_PROMPTS
        ? payload.type
        : "workout";
    const systemPrompt = SYSTEM_PROMPTS[type];

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    if (!response) {
      return NextResponse.json(
        { error: "AI response was empty" },
        { status: 502 },
      );
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json(
      { error: "Failed to get AI response" },
      { status: 500 },
    );
  }
}
