"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AnalyticsData {
  totalWorkouts: number;
  totalVolume: number;
  topExercises: { name: string; volume: number }[];
  weeksData: { week: string; count: number }[];
  strengthTrend: { date: string; weight: number }[];
  topExerciseName: string | null;
  bestLifts: { name: string; weight: number }[];
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Failed to load analytics.</p>
      </div>
    );
  }

  const maxWeekCount = Math.max(...data.weeksData.map((w) => w.count), 1);
  const maxVolume = Math.max(...data.topExercises.map((e) => e.volume), 1);
  const maxWeight = Math.max(...data.strengthTrend.map((s) => s.weight), 1);
  const minWeight = Math.min(...data.strengthTrend.map((s) => s.weight), 0);

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
          Progress Analytics
        </h1>
        <div className="w-10" />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total Workouts</p>
            <p className="text-3xl font-bold text-gray-900">
              {data.totalWorkouts}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total Volume</p>
            <p className="text-3xl font-bold text-gray-900">
              {data.totalVolume >= 1000
                ? `${(data.totalVolume / 1000).toFixed(1)}k`
                : data.totalVolume}
              <span className="text-sm font-normal text-gray-400 ml-1">kg</span>
            </p>
          </div>
        </div>

        {/* Workouts per week */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Workouts per week
          </h2>
          {data.weeksData.every((w) => w.count === 0) ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No workout data yet.
            </p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {data.weeksData.map((week, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full flex items-end justify-center"
                    style={{ height: "96px" }}
                  >
                    <div
                      className="w-full bg-black rounded-t-md transition-all"
                      style={{
                        height: `${Math.max((week.count / maxWeekCount) * 96, week.count > 0 ? 4 : 0)}px`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 truncate w-full text-center">
                    {week.week}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strength trend */}
        {data.strengthTrend.length > 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              Strength trend
            </h2>
            <p className="text-xs text-gray-400 mb-4 capitalize">
              {data.topExerciseName} — best set per session
            </p>
            <div className="relative h-32">
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${data.strengthTrend.length * 50} 96`}
                preserveAspectRatio="none"
              >
                <polyline
                  points={data.strengthTrend
                    .map((s, i) => {
                      const x = i * 50 + 25;
                      const y =
                        96 -
                        ((s.weight - minWeight) /
                          (maxWeight - minWeight || 1)) *
                          80 -
                        8;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {data.strengthTrend.map((s, i) => {
                  const x = i * 50 + 25;
                  const y =
                    96 -
                    ((s.weight - minWeight) / (maxWeight - minWeight || 1)) *
                      80 -
                    8;
                  return <circle key={i} cx={x} cy={y} r="3" fill="black" />;
                })}
              </svg>
              {/* Y axis labels */}
              <div className="absolute top-0 right-0 flex flex-col justify-between h-full text-right">
                <span className="text-xs text-gray-400">{maxWeight}kg</span>
                <span className="text-xs text-gray-400">{minWeight}kg</span>
              </div>
            </div>
            {/* X axis labels */}
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">
                {data.strengthTrend[0]?.date}
              </span>
              <span className="text-xs text-gray-400">
                {data.strengthTrend[data.strengthTrend.length - 1]?.date}
              </span>
            </div>
          </div>
        )}

        {/* Top exercises by volume */}
        {data.topExercises.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Top exercises by volume
            </h2>
            <div className="space-y-3">
              {data.topExercises.map((ex, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-700 capitalize truncate max-w-[70%]">
                      {ex.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {ex.volume.toLocaleString()} kg
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black rounded-full"
                      style={{ width: `${(ex.volume / maxVolume) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best lifts */}
        {data.bestLifts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Best lifts
            </h2>
            <div className="space-y-2">
              {data.bestLifts.map((lift, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm text-gray-700 capitalize">
                    {lift.name}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {lift.weight} kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {data.totalWorkouts === 0 && (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400 mb-3">No workout data yet.</p>
            <Link
              href="/dashboard/log"
              className="text-sm font-medium text-black hover:underline"
            >
              Log your first workout →
            </Link>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
