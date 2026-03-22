"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  ok: "✓ On Track",
  at_risk: "⚠ At Risk",
  high: "● High Fatigue",
};

export default function AIReportClient() {
  const [report, setReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    // Load most recent report on mount
    fetch("/api/ai-report")
      .then((r) => r.json())
      .then((d) => {
        if (d.report) setReport(d.report);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, []);

  async function generateReport() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai-report", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate report.");
        return;
      }

      setReport(data.report);
      setGenerated(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fatigue = report?.fatigue;
  const fatigueStyle = fatigue ? fatigueColors[fatigue.status] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </Link>
        <h1 className="text-sm font-semibold text-gray-900">
          AI Performance Report
        </h1>
        <div className="w-10" />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Generate button */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Weekly Analysis
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Based on your last 4 weeks of training
              </p>
            </div>
            <button
              onClick={generateReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
            <p className="text-xs text-green-600 mt-2">
              ✓ New report generated and saved
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {fetching && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
          </div>
        )}

        {/* No report yet */}
        {!fetching && !report && !loading && (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400 mb-1">
              No report generated yet.
            </p>
            <p className="text-xs text-gray-400">
              Click "Generate Report" to get your AI performance analysis.
            </p>
          </div>
        )}

        {/* Report sections */}
        {report && (
          <>
            {/* Weekly summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Weekly Summary
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Sessions</p>
                  <p className="text-xl font-bold text-gray-900">
                    {report.weekly_summary.sessions_this_week}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Volume</p>
                  <p className="text-xl font-bold text-gray-900">
                    {report.weekly_summary.total_volume_kg >= 1000
                      ? `${(report.weekly_summary.total_volume_kg / 1000).toFixed(1)}k`
                      : report.weekly_summary.total_volume_kg}
                    <span className="text-xs font-normal text-gray-400 ml-0.5">
                      kg
                    </span>
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">vs Last Week</p>
                  <p
                    className={`text-xl font-bold ${report.weekly_summary.vs_last_week.startsWith("+") ? "text-green-600" : report.weekly_summary.vs_last_week.startsWith("-") ? "text-red-500" : "text-gray-900"}`}
                  >
                    {report.weekly_summary.vs_last_week}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  ✦ {report.weekly_summary.highlight}
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
                    {report.plateau.detected
                      ? "Plateau Detected"
                      : "No Plateau"}
                  </span>
                </div>
                {report.plateau.detected && report.plateau.exercise && (
                  <p className="text-sm text-orange-700 mb-2">
                    <span className="font-medium capitalize">
                      {report.plateau.exercise}
                    </span>
                    {report.plateau.weeks_stalled &&
                      ` — stalled for ${report.plateau.weeks_stalled} week${report.plateau.weeks_stalled > 1 ? "s" : ""}`}
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
                  {report.progression.map((item, i) => (
                    <div
                      key={i}
                      className="border border-gray-100 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 capitalize">
                          {item.exercise}
                        </span>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="text-gray-400">
                            {item.current_max_kg}kg
                          </span>
                          <span className="text-gray-300">→</span>
                          <span className="font-semibold text-black">
                            {item.suggested_next_kg}kg
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">{item.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
