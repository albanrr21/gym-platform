import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPTS: Record<string, string> = {
  workout: `You are GymAI, an elite performance coach. Analyze workout data and provide precise, actionable training feedback. Always reference specific metrics. Identify fatigue risk, suggest progression in 2.5–5% increments, and flag plateaus. Start with a status: On Track, At Risk, or Plateau. Be direct and data-driven. You always answer in Albanian.`,
  nutrition: `You are GymAI, a sports nutrition specialist. Provide evidence-based nutrition guidance tailored to training intensity. Give protein in g/kg bodyweight, avoid extreme deficits, and structure advice around pre/intra/post workout windows. Be concise and practical. You always answer in Albanian.`,
  admin: `You are GymAI, a business intelligence assistant for gym owners. Interpret member engagement data and provide retention-focused insights. Frame everything around churn risk and member LTV. Suggest only quick wins implementable within 7 days. You always answer in Albanian.`,
};

export async function POST(request: NextRequest) {
  try {
    const { message, type } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.workout;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    const response = completion.choices[0].message.content;
    return NextResponse.json({ response });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json(
      { error: "Failed to get AI response" },
      { status: 500 },
    );
  }
}
