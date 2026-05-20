import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit } from "@/lib/rateLimit";

const SYSTEM_PROMPTS: Record<string, string> = {
  workout: `You are GymAI, an elite performance coach. Analyze workout data and provide precise, actionable training feedback. Always reference specific metrics. Identify fatigue risk, suggest progression in 2.5-5% increments, and flag plateaus. Start with a status: On Track, At Risk, or Plateau. Be direct and data-driven. You always answer in Albanian.`,
  nutrition: `You are GymAI, a sports nutrition specialist. Provide evidence-based nutrition guidance tailored to training intensity. Give protein in g/kg bodyweight, avoid extreme deficits, and structure advice around pre/intra/post workout windows. Be concise and practical. You always answer in Albanian.`,
  admin: `You are GymAI, a business intelligence assistant for gym owners. Interpret member engagement data and provide retention-focused insights. Frame everything around churn risk and member LTV. Suggest only quick wins implementable within 7 days. You always answer in Albanian.`,
};

const MAX_MESSAGE_LENGTH = 2000;
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous/i,
  /\[INST\]/i,
  /system\s*:/i,
  /###/i,
  /https?:\/\//i,
  /<script\b/i,
  /\[SYSTEM\]/i,
];

function isSafeMessage(msg: string): boolean {
  return !INJECTION_PATTERNS.some((pattern) => pattern.test(msg));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Per-user rate limit
  if (!checkRateLimit(`ai:${user.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 },
    );
  }

  // Per-IP rate limit (best-effort using common headers)
  const ip =
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(`ai:ip:${ip}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded for this IP. Try again later." },
      { status: 429 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set" },
      { status: 500 },
    );
  }

  try {
    const payload = (await request.json()) as {
      message?: unknown;
      messages?: unknown;
      type?: unknown;
    };

    const inputMessages: { role: "user" | "assistant"; content: string }[] = [];
    if (Array.isArray(payload.messages)) {
      for (const item of payload.messages) {
        if (
          typeof item === "object" &&
          item !== null &&
          "role" in item &&
          "content" in item &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string"
        ) {
          const content = item.content.trim();
          if (!content) continue;
          if (content.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json(
              {
                error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`,
              },
              { status: 400 },
            );
          }
          if (!isSafeMessage(content)) {
            return NextResponse.json(
              { error: "Message contains unsafe prompt-injection content." },
              { status: 400 },
            );
          }
          inputMessages.push({ role: item.role, content });
        }
      }
    }

    if (inputMessages.length === 0 && typeof payload.message === "string") {
      const message = payload.message.trim();
      if (message) {
        if (message.length > MAX_MESSAGE_LENGTH) {
          return NextResponse.json(
            {
              error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`,
            },
            { status: 400 },
          );
        }
        if (!isSafeMessage(message)) {
          return NextResponse.json(
            { error: "Message contains unsafe prompt-injection content." },
            { status: 400 },
          );
        }
        inputMessages.push({ role: "user", content: message });
      }
    }

    if (inputMessages.length === 0) {
      return NextResponse.json(
        { error: "At least one message is required" },
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
      messages: [{ role: "system", content: systemPrompt }, ...inputMessages],
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
