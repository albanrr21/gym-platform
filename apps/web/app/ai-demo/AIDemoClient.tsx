"use client";

import { useEffect, useRef, useState } from "react";
import { fetchJson, FetchJsonError } from "@/lib/http/fetchJson";
import { useToast } from "@/components/ui/Toast";

const TYPES = [
  {
    id: "workout",
    label: "Workout analysis",
    presets: [
      "Bench press 80kg x5 RPE9 three days in a row. Analyze.",
      "No strength gains in 4 weeks on squat. What's wrong?",
      "Weekly volume: chest 18 sets, legs 6 sets. Is this balanced?",
    ],
  },
  {
    id: "nutrition",
    label: "Nutrition",
    presets: [
      "I train 5x/week, weigh 80kg. How much protein do I need?",
      "Best pre-workout meal 1 hour before heavy squats?",
      "I'm on a 500 kcal deficit but losing strength. What to do?",
    ],
  },
  {
    id: "admin",
    label: "Gym admin",
    presets: [
      "10 members haven't logged in for 2 weeks. What should I do?",
      "Leaderboard engagement dropped 40% this month. Analyze.",
      "60% attendance drop on Fridays. How to fix it?",
    ],
  },
];

export default function AIDemoClient() {
  const [activeType, setActiveType] = useState("workout");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const endRef = useRef<HTMLDivElement | null>(null);

  const currentType = TYPES.find((t) => t.id === activeType)!;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit() {
    const userMessage = input.trim();
    if (!userMessage) return;
    if (loading) return;
    setLoading(true);
    setInput("");

    const nextMessages = [
      ...messages,
      { role: "user" as const, content: userMessage },
    ];
    setMessages(nextMessages);

    try {
      const data = await fetchJson<{ response: string }>("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, type: activeType }),
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      if (err instanceof FetchJsonError) {
        showToast(err.message, "error");
      } else {
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500 mt-1">
            Powered by GPT-4o mini - select a mode and ask a question.
          </p>
        </div>

        {/* Type selector */}
        <div className="flex gap-2 mb-4">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveType(t.id);
                setInput("");
                setMessages([]);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeType === t.id
                  ? "bg-black text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Preset queries */}
        <div className="flex flex-wrap gap-2 mb-4">
          {currentType.presets.map((preset) => (
            <button
              key={preset}
              onClick={() => setInput(preset)}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-500 rounded-full hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              {preset.length > 48 ? preset.slice(0, 48) + "..." : preset}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder="Type your message or pick a preset above..."
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Cmd + Enter to send</span>
            <button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Thinking...
                </>
              ) : (
                "Send"
              )}
            </button>
          </div>
        </div>

        {/* Errors surfaced as toasts */}

        {messages.length > 0 && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setMessages([])}
              className="text-xs rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              Clear conversation
            </button>
          </div>
        )}

        {/* Chat thread */}
        {messages.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 max-h-[420px] overflow-auto">
            {messages.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">
              Your AI response will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
