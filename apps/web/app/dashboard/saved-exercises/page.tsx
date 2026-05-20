"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson, FetchJsonError } from "@/lib/http/fetchJson";
import { useToast } from "@/components/ui/Toast";

type SavedExerciseItem = {
  name: string;
  body_part: string;
  equipment: string;
  times_logged: number;
  best_weight: number;
  total_volume: number;
  saved: boolean;
};

export default function SavedExercisesPage() {
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
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No logged exercises yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                            ? "bg-black text-white"
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
      )}
    </div>
  );
}
