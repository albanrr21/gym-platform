"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson, FetchJsonError } from "@/lib/http/fetchJson";
import { useToast } from "@/components/ui/Toast";
import Skeleton from "@/components/ui/Skeleton";

type SavedExerciseItem = {
  name: string;
  body_part: string;
  equipment: string;
  times_logged: number;
  best_weight: number;
  total_volume: number;
  saved: boolean;
};

export default function SavedExercisesClient() {
  const [items, setItems] = useState<SavedExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await fetchJson<{ exercises: SavedExerciseItem[] }>(
        "/api/saved-exercises",
      );
      setItems(data.exercises ?? []);
    } catch (err) {
      if (err instanceof FetchJsonError) showToast(err.message, "error");
      else showToast("Failed to load saved exercises.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleSave(item: SavedExerciseItem) {
    try {
      if (item.saved) {
        await fetchJson<{ ok: boolean }>(
          `/api/saved-exercises?name=${encodeURIComponent(item.name)}`,
          { method: "DELETE" },
        );
      } else {
        await fetchJson<{ ok: boolean }>("/api/saved-exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            body_part: item.body_part,
            equipment: item.equipment,
          }),
        });
      }
      setItems((prev) =>
        prev.map((x) => (x.name === item.name ? { ...x, saved: !x.saved } : x)),
      );
      const nowSaved = !item.saved;
      showToast(nowSaved ? "Exercise saved." : "Exercise removed.", "success");
    } catch (err) {
      if (err instanceof FetchJsonError) showToast(err.message, "error");
      else showToast("Failed to update saved exercise.", "error");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Saved Exercises</h1>
        <p className="text-sm text-gray-500">
          Frequently used movements and quick stats.
        </p>
      </div>

      {/* Errors surfaced via toasts */}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-56" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No logged exercises yet.{" "}
          <Link
            href="/dashboard/log"
            className="font-medium text-gray-900 hover:underline"
          >
            Log a workout
          </Link>{" "}
          to build this list.
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 sm:hidden">
            {items.map((item) => (
              <div
                key={item.name}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium capitalize text-gray-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-gray-500">
                      {[item.body_part, item.equipment]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleSave(item)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                      item.saved
                        ? "bg-[var(--theme-brand)] text-[var(--theme-brand-foreground)]"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item.saved ? "Saved" : "Save"}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-600">
                    {item.times_logged}x logged · best {item.best_weight} kg
                  </p>
                  <Link
                    href={`/dashboard/log?exercise=${encodeURIComponent(item.name)}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Quick add
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white sm:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-4 py-3">Exercise</th>
                <th className="px-4 py-3">Body Part</th>
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">Times Logged</th>
                <th className="px-4 py-3">Best Weight</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.name}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 capitalize">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {item.body_part || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {item.equipment || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.times_logged}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.best_weight} kg
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSave(item)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          item.saved
                            ? "bg-[var(--theme-brand)] text-[var(--theme-brand-foreground)]"
                            : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {item.saved ? "Saved" : "Save"}
                      </button>
                      <Link
                        href={`/dashboard/log?exercise=${encodeURIComponent(item.name)}`}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Quick add
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
