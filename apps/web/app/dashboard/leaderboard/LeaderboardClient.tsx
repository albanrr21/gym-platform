"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardEntry {
  userId: string;
  name: string;
  value: number;
  rank: number;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  volume: LeaderboardEntry[];
  consistency: LeaderboardEntry[];
  gymName: string;
}

const medals = ["🥇", "🥈", "🥉"];

function getRankDisplay(rank: number) {
  if (rank <= 3) return medals[rank - 1];
  return `#${rank}`;
}

function LeaderboardTable({
  entries,
  unit,
}: {
  entries: LeaderboardEntry[];
  unit: string;
}) {
  if (!entries.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-400">No data yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          Log workouts to appear on the leaderboard.
        </p>
      </div>
    );
  }

  const maxValue = entries[0]?.value || 1;

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.userId}
          className={`rounded-xl p-3 ${
            entry.isCurrentUser ? "bg-black text-white" : "bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Rank */}
            <div className="w-8 text-center flex-shrink-0">
              <span
                className={`text-sm font-bold ${entry.isCurrentUser ? "text-white" : "text-gray-500"}`}
              >
                {getRankDisplay(entry.rank)}
              </span>
            </div>

            {/* Name + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium truncate ${entry.isCurrentUser ? "text-white" : "text-gray-800"}`}
                >
                  {entry.name}
                  {entry.isCurrentUser && (
                    <span className="ml-2 text-xs font-normal opacity-70">
                      you
                    </span>
                  )}
                </span>
                <span
                  className={`text-sm font-semibold ml-2 flex-shrink-0 ${entry.isCurrentUser ? "text-white" : "text-gray-900"}`}
                >
                  {unit === "kg" && entry.value >= 1000
                    ? `${(entry.value / 1000).toFixed(1)}k`
                    : entry.value}
                  <span
                    className={`text-xs font-normal ml-0.5 ${entry.isCurrentUser ? "opacity-70" : "text-gray-400"}`}
                  >
                    {unit}
                  </span>
                </span>
              </div>

              {/* Progress bar */}
              <div
                className={`h-1 rounded-full ${entry.isCurrentUser ? "bg-white/20" : "bg-gray-200"}`}
              >
                <div
                  className={`h-full rounded-full ${entry.isCurrentUser ? "bg-white" : "bg-black"}`}
                  style={{ width: `${(entry.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardClient() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"volume" | "consistency">("volume");

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
        <div className="text-center">
          <h1 className="text-sm font-semibold text-gray-900">Leaderboard</h1>
          {data?.gymName && (
            <p className="text-xs text-gray-400">{data.gymName}</p>
          )}
        </div>
        <div className="w-10" />
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => setTab("volume")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === "volume"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Total Volume
          </button>
          <button
            onClick={() => setTab("consistency")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === "consistency"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Consistency
          </button>
        </div>

        {/* Content */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          ) : tab === "volume" ? (
            <>
              <p className="text-xs text-gray-400 mb-3">
                Ranked by total kg lifted — all time
              </p>
              <LeaderboardTable entries={data?.volume || []} unit="kg" />
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                Ranked by workouts logged this month
              </p>
              <LeaderboardTable
                entries={data?.consistency || []}
                unit="sessions"
              />
            </>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
