"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/http/fetchJson";
import AnalyticsSkeleton from "./AnalyticsSkeleton";
import { useThemeColor } from "@/lib/theme/useThemeColor";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  const brandColor = useThemeColor("--theme-brand", "#111827");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchJson<AnalyticsData>("/api/analytics");
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-gray-600">
          Couldn&apos;t load your analytics.
        </p>
        <button
          onClick={() => void loadAnalytics()}
          className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Try again
        </button>
      </div>
    );
  }

  const maxVolume = Math.max(...data.topExercises.map((e) => e.volume), 1);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-1 text-xs text-gray-500">Total Workouts</p>
          <p className="text-3xl font-bold text-gray-900">
            {data.totalWorkouts}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-1 text-xs text-gray-500">Total Volume</p>
          <p className="text-3xl font-bold text-gray-900">
            {data.totalVolume >= 1000
              ? `${(data.totalVolume / 1000).toFixed(1)}k`
              : data.totalVolume}
            <span className="ml-1 text-sm font-normal text-gray-500">kg</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          Workouts per week
        </h2>
        {data.weeksData.every((w) => w.count === 0) ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No workout data yet.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeksData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <Tooltip
                  cursor={{ fill: "#f9fafb" }}
                  contentStyle={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.75rem",
                  }}
                />
                <Bar dataKey="count" fill={brandColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {data.strengthTrend.length > 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">
            Strength trend
          </h2>
          <p className="mb-4 text-xs text-gray-500 capitalize">
            {data.topExerciseName} - best set per session
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.strengthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip
                  cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
                  contentStyle={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.75rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke={brandColor}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.topExercises.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Top exercises by volume
          </h2>
          <div className="space-y-3">
            {data.topExercises.map((ex) => (
              <div key={ex.name}>
                <div className="mb-1 flex justify-between">
                  <span className="max-w-[70%] truncate text-xs capitalize text-gray-700">
                    {ex.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {ex.volume.toLocaleString()} kg
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[var(--theme-brand)]"
                    style={{ width: `${(ex.volume / maxVolume) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.bestLifts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Best lifts
          </h2>
          <div className="space-y-2">
            {data.bestLifts.map((lift) => (
              <div
                key={lift.name}
                className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0"
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

      {data.totalWorkouts === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="mb-3 text-sm text-gray-500">No workout data yet.</p>
          <Link
            href="/dashboard/log"
            className="text-sm font-medium text-black hover:underline"
          >
            Log your first workout -&gt;
          </Link>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
