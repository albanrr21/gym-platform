"use client";

import { useState, useEffect } from "react";
import { fetchJson } from "@/lib/http/fetchJson";
import { useToast } from "@/components/ui/Toast";
import AIReportSkeleton from "./AIReportSkeleton";

interface FatigueReport {
  status: "ok" | "at_risk" | "high";
  message: string;
  recommendation: string;
}

interface PlateauReport {
  detected: boolean;
  exercise: string | null;
  weeks_stalled: number | null;
  recommendation: string | null;
}

interface ProgressionItem {
  exercise: string;
  current_max_kg: number;
  suggested_next_kg: number;
  reasoning: string;
}

interface WeeklySummary {
  total_volume_kg: number;
  vs_last_week: string;
  sessions_this_week: number;
  highlight: string;
}

interface AIReport {
  fatigue: FatigueReport;
  plateau: PlateauReport;
  progression: ProgressionItem[];
  weekly_summary: WeeklySummary;
}

const fatigueColors = {
  ok: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    badge: "bg-green-100 text-green-700",
  },
  at_risk: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-700",
  },
  high: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
  },
};

const fatigueLabels = {
  ok: "On track",
  at_risk: "At risk",
  high: "High fatigue",
};

const generationStages = [
  "Reading your training history",
  "Analyzing volume and fatigue",
  "Checking for plateaus",
  "Writing recommendations",
];

function getCurrentStage(streamedLength: number) {
  if (streamedLength === 0) return 0;
  if (streamedLength < 300) return 1;
  if (streamedLength < 700) return 2;
  return 3;
}

export default function AIReportClient() {
  const [report, setReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    fetchJson<{ report?: AIReport }>("/api/ai-report")
      .then((d) => {
        if (!cancelled && d.report) setReport(d.report);
      })
      .catch(() => {
        if (!cancelled)
          showToast("Unable to load your latest report.", "error");
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateReport() {
    if (loading) return;
    setLoading(true);
    setStreamedText("");

    try {
      const response = await fetch("/api/ai-report", { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to generate report.");
      }
      if (!response.body) {
        throw new Error("Streaming is not available.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        setStreamedText(raw);
      }

      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as AIReport;
      setReport(parsed);
      setGenerated(true);
      showToast("AI report generated.", "success");
    } catch (err) {
      if (err instanceof Error) {
        showToast(err.message, "error");
      } else {
        showToast("Something went wrong. Please try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  const fatigue = report?.fatigue;
  const fatigueStyle = fatigue ? fatigueColors[fatigue.status] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Weekly Analysis</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Based on your last 4 weeks of training
            </p>
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[var(--theme-brand)] px-4 py-2 text-sm font-medium text-[var(--theme-brand-foreground)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing...
              </>
            ) : report ? (
              "Regenerate"
            ) : (
              "Generate Report"
            )}
          </button>
        </div>

        {generated && (
          <p className="mt-2 text-xs text-green-600">
            New report generated and saved.
          </p>
        )}
      </div>

      {/* Errors are surfaced via toasts */}

      {/* Loading state */}
      {fetching && <AIReportSkeleton />}

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <ul className="space-y-2.5">
            {generationStages.map((stage, index) => {
              const currentStage = getCurrentStage(streamedText.length);
              const done = index < currentStage;
              const active = index === currentStage;

              return (
                <li
                  key={stage}
                  className={`flex items-center gap-2.5 text-sm ${
                    done
                      ? "text-gray-500"
                      : active
                        ? "font-medium text-gray-900"
                        : "text-gray-300"
                  }`}
                >
                  {done ? (
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 text-green-500"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : active ? (
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-200" />
                  )}
                  {stage}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* No report yet */}
      {!fetching && !report && !loading && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="mb-1 text-sm text-gray-500">No report generated yet.</p>
          <p className="text-xs text-gray-500">
            Click Generate Report to get your AI performance analysis.
          </p>
        </div>
      )}

      {/* Report sections */}
      {report && (
        <>
          {/* Weekly summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Weekly Summary
            </h2>
            <div className="mb-3 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="mb-1 text-xs text-gray-500">Sessions</p>
                <p className="text-xl font-bold text-gray-900">
                  {report.weekly_summary.sessions_this_week}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="mb-1 text-xs text-gray-500">Volume</p>
                <p className="text-xl font-bold text-gray-900">
                  {report.weekly_summary.total_volume_kg >= 1000
                    ? `${(report.weekly_summary.total_volume_kg / 1000).toFixed(1)}k`
                    : report.weekly_summary.total_volume_kg}
                  <span className="ml-0.5 text-xs font-normal text-gray-500">
                    kg
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="mb-1 text-xs text-gray-500">vs Last Week</p>
                <p
                  className={`text-xl font-bold ${report.weekly_summary.vs_last_week.startsWith("+") ? "text-green-600" : report.weekly_summary.vs_last_week.startsWith("-") ? "text-red-500" : "text-gray-900"}`}
                >
                  {report.weekly_summary.vs_last_week}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs leading-relaxed text-gray-500">
                * {report.weekly_summary.highlight}
              </p>
            </div>
          </div>

          {/* Fatigue */}
          {fatigue && fatigueStyle && (
            <div
              className={`border rounded-xl p-4 ${fatigueStyle.bg} ${fatigueStyle.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  Fatigue Assessment
                </h2>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${fatigueStyle.badge}`}
                >
                  {fatigueLabels[fatigue.status]}
                </span>
              </div>
              <p className={`text-sm mb-2 ${fatigueStyle.text}`}>
                {fatigue.message}
              </p>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs text-gray-600 font-medium mb-0.5">
                  Recommendation
                </p>
                <p className="text-sm text-gray-700">
                  {fatigue.recommendation}
                </p>
              </div>
            </div>
          )}

          {/* Plateau */}
          {report.plateau && (
            <div
              className={`border rounded-xl p-4 ${report.plateau.detected ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  Plateau Detection
                </h2>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${report.plateau.detected ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}
                >
                  {report.plateau.detected ? "Plateau Detected" : "No Plateau"}
                </span>
              </div>
              {report.plateau.detected && report.plateau.exercise && (
                <p className="text-sm text-orange-700 mb-2">
                  <span className="font-medium capitalize">
                    {report.plateau.exercise}
                  </span>
                  {report.plateau.weeks_stalled &&
                    ` - stalled for ${report.plateau.weeks_stalled} week${report.plateau.weeks_stalled > 1 ? "s" : ""}`}
                </p>
              )}
              {report.plateau.recommendation && (
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs text-gray-600 font-medium mb-0.5">
                    Recommendation
                  </p>
                  <p className="text-sm text-gray-700">
                    {report.plateau.recommendation}
                  </p>
                </div>
              )}
              {!report.plateau.detected && (
                <p className="text-sm text-green-700">
                  Your lifts are progressing well. Keep it up.
                </p>
              )}
            </div>
          )}

          {/* Progression suggestions */}
          {report.progression?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Progression Suggestions
              </h2>
              <div className="space-y-3">
                {report.progression.map((item) => (
                  <div
                    key={item.exercise}
                    className="border border-gray-100 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 capitalize">
                        {item.exercise}
                      </span>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-gray-500">
                          {item.current_max_kg}kg
                        </span>
                        <span className="text-gray-300">-&gt;</span>
                        <span className="font-semibold text-black">
                          {item.suggested_next_kg}kg
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{item.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="h-4" />
    </div>
  );
}
