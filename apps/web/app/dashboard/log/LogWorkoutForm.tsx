"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

interface ExerciseSet {
  weight_kg: number;
  reps: number;
  rpe: number;
  completed: boolean;
}

interface Exercise {
  name: string;
  exerciseId?: string;
  bodyPart?: string;
  equipment?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  sets: ExerciseSet[];
}

interface ExerciseResult {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  secondaryMuscles: string[];
  instructions: string[];
}

interface InfoModal {
  name: string;
  bodyPart: string;
  equipment: string;
  secondaryMuscles: string[];
  instructions: string[];
  exerciseId: string;
}

const emptySet = (): ExerciseSet => ({
  weight_kg: 0,
  reps: 10,
  rpe: 7,
  completed: false,
});

const emptyExercise = (): Exercise => ({
  name: "",
  sets: [emptySet(), emptySet(), emptySet()],
});

export default function LogWorkoutForm({ gymId }: { gymId: string }) {
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<ExerciseResult[][]>([[]]);
  const [searching, setSearching] = useState<boolean[]>([false]);
  const [infoModal, setInfoModal] = useState<InfoModal | null>(null);
  const [infoImage, setInfoImage] = useState<string | null>(null);
  const router = useRouter();

  // ── Search ──────────────────────────────────────────
  async function searchExercise(index: number, term: string) {
    if (term.length < 3) {
      setSearchResults((prev) => {
        const n = [...prev];
        n[index] = [];
        return n;
      });
      return;
    }
    setSearching((prev) => {
      const n = [...prev];
      n[index] = true;
      return n;
    });
    try {
      const res = await fetch(
        `/api/exercises/search?name=${encodeURIComponent(term)}`,
      );
      const data = await res.json();
      setSearchResults((prev) => {
        const n = [...prev];
        n[index] = data.exercises || [];
        return n;
      });
    } catch {
      setSearchResults((prev) => {
        const n = [...prev];
        n[index] = [];
        return n;
      });
    } finally {
      setSearching((prev) => {
        const n = [...prev];
        n[index] = false;
        return n;
      });
    }
  }

  const debouncedSearch = useDebouncedCallback(searchExercise, 400);

  function selectExercise(index: number, result: ExerciseResult) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === index
          ? {
              ...e,
              name: result.name,
              exerciseId: result.id,
              bodyPart: result.bodyPart,
              equipment: result.equipment,
              secondaryMuscles: result.secondaryMuscles,
              instructions: result.instructions,
            }
          : e,
      ),
    );
    setSearchResults((prev) => {
      const n = [...prev];
      n[index] = [];
      return n;
    });
  }

  // ── Exercise CRUD ────────────────────────────────────
  function addExercise() {
    setExercises((prev) => [...prev, emptyExercise()]);
    setSearchResults((prev) => [...prev, []]);
    setSearching((prev) => [...prev, false]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
    setSearchResults((prev) => prev.filter((_, i) => i !== index));
    setSearching((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExerciseName(index: number, value: string) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === index
          ? {
              ...e,
              name: value,
              exerciseId: undefined,
              bodyPart: undefined,
              equipment: undefined,
            }
          : e,
      ),
    );
  }

  // ── Set CRUD ─────────────────────────────────────────
  function addSet(exIndex: number) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIndex ? { ...e, sets: [...e.sets, emptySet()] } : e,
      ),
    );
  }

  function removeSet(exIndex: number, setIndex: number) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIndex
          ? { ...e, sets: e.sets.filter((_, si) => si !== setIndex) }
          : e,
      ),
    );
  }

  function updateSet(
    exIndex: number,
    setIndex: number,
    field: keyof ExerciseSet,
    value: number | boolean,
  ) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIndex
          ? {
              ...e,
              sets: e.sets.map((s, si) =>
                si === setIndex ? { ...s, [field]: value } : s,
              ),
            }
          : e,
      ),
    );
  }

  function toggleSet(exIndex: number, setIndex: number) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIndex
          ? {
              ...e,
              sets: e.sets.map((s, si) =>
                si === setIndex ? { ...s, completed: !s.completed } : s,
              ),
            }
          : e,
      ),
    );
  }

  // ── Info Modal ───────────────────────────────────────
  function openInfo(exercise: Exercise) {
    if (!exercise.exerciseId) return;
    setInfoModal({
      name: exercise.name,
      bodyPart: exercise.bodyPart || "",
      equipment: exercise.equipment || "",
      secondaryMuscles: exercise.secondaryMuscles || [],
      instructions: exercise.instructions || [],
      exerciseId: exercise.exerciseId,
    });
    setInfoImage(`/api/exercises/image?exerciseId=${exercise.exerciseId}`);
  }

  function closeInfo() {
    setInfoModal(null);
    setInfoImage(null);
  }

  // ── Submit ───────────────────────────────────────────
  async function handleSubmit() {
    setLoading(true);
    setError("");

    const invalid = exercises.some((e) => !e.name.trim());
    if (invalid) {
      setError("All exercises must have a name.");
      setLoading(false);
      return;
    }

    const noSets = exercises.some((e) => e.sets.length === 0);
    if (noSets) {
      setError("Each exercise must have at least one set.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercises, notes, gym_id: gymId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save workout.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Cancel
        </button>
        <h1 className="text-sm font-semibold text-gray-900">Log Workout</h1>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm font-semibold text-black disabled:opacity-40"
        >
          {loading ? "Saving..." : "Finish"}
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Exercises */}
        {exercises.map((exercise, exIndex) => (
          <div
            key={exIndex}
            className="bg-white border border-gray-200 rounded-xl"
          >
            {/* Exercise header */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search exercise..."
                    value={exercise.name}
                    onChange={(e) => {
                      updateExerciseName(exIndex, e.target.value);
                      debouncedSearch(exIndex, e.target.value);
                    }}
                    className="w-full text-sm font-semibold text-blue-600 placeholder-gray-400 border-none outline-none bg-transparent"
                  />

                  {/* Dropdown */}
                  {searchResults[exIndex]?.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto">
                      {searchResults[exIndex].map((result) => (
                        <div
                          key={result.id}
                          onClick={() => selectExercise(exIndex, result)}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800 capitalize">
                              {result.name}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">
                              {result.bodyPart} · {result.equipment}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searching[exIndex] && (
                    <p className="text-xs text-gray-400 mt-0.5">Searching...</p>
                  )}
                </div>

                {/* Info button */}
                {exercise.exerciseId && (
                  <button
                    onClick={() => openInfo(exercise)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors flex-shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </button>
                )}

                {/* Remove exercise */}
                {exercises.length > 1 && (
                  <button
                    onClick={() => removeExercise(exIndex)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors flex-shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Tags */}
              {exercise.exerciseId && (
                <div className="flex gap-1.5 mt-1.5">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                    {exercise.bodyPart}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                    {exercise.equipment}
                  </span>
                </div>
              )}
            </div>

            {/* Sets table header */}
            <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-gray-50 border-t border-gray-100">
              <div className="col-span-1 text-xs font-medium text-gray-400 text-center">
                Set
              </div>
              <div className="col-span-3 text-xs font-medium text-gray-400 text-center">
                Previous
              </div>
              <div className="col-span-3 text-xs font-medium text-gray-400 text-center">
                kg
              </div>
              <div className="col-span-3 text-xs font-medium text-gray-400 text-center">
                Reps
              </div>
              <div className="col-span-2 text-xs font-medium text-gray-400 text-center">
                ✓
              </div>
            </div>

            {/* Sets */}
            {exercise.sets.map((set, setIndex) => (
              <div
                key={setIndex}
                className={`grid grid-cols-12 gap-1 px-4 py-2 items-center border-t border-gray-50 ${set.completed ? "bg-green-50" : ""}`}
              >
                {/* Set number */}
                <div className="col-span-1 flex items-center justify-center">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${set.completed ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}
                  >
                    {setIndex + 1}
                  </span>
                </div>

                {/* Previous (placeholder) */}
                <div className="col-span-3 text-center">
                  <span className="text-xs text-gray-300">—</span>
                </div>

                {/* Weight */}
                <div className="col-span-3">
                  <input
                    type="number"
                    value={set.weight_kg}
                    min={0}
                    step={0.5}
                    onChange={(e) =>
                      updateSet(
                        exIndex,
                        setIndex,
                        "weight_kg",
                        parseFloat(e.target.value),
                      )
                    }
                    className={`w-full text-center text-sm font-medium border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-black ${set.completed ? "bg-green-100 border-green-200 text-green-800" : "bg-white text-gray-800"}`}
                  />
                </div>

                {/* Reps */}
                <div className="col-span-3">
                  <input
                    type="number"
                    value={set.reps}
                    min={0}
                    onChange={(e) =>
                      updateSet(
                        exIndex,
                        setIndex,
                        "reps",
                        parseInt(e.target.value),
                      )
                    }
                    className={`w-full text-center text-sm font-medium border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-black ${set.completed ? "bg-green-100 border-green-200 text-green-800" : "bg-white text-gray-800"}`}
                  />
                </div>

                {/* Complete toggle + remove */}
                <div className="col-span-2 flex items-center justify-center gap-2">
                  <button
                    onClick={() => toggleSet(exIndex, setIndex)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${set.completed ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeSet(exIndex, setIndex)}
                    disabled={exercise.sets.length <= 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors bg-red-50 text-red-400 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Remove set"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="6" y1="18" x2="18" y2="6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Add set */}
            <div className="px-4 pb-4 pt-2">
              <button
                onClick={() => addSet(exIndex)}
                className="w-full py-2 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg border border-dashed border-gray-200 transition-colors"
              >
                + Add Set
              </button>
            </div>
          </div>
        ))}

        {/* Add exercise */}
        <button
          onClick={addExercise}
          className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors bg-white"
        >
          + Add Exercise
        </button>

        {/* Notes */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="How did the session feel?"
            className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none outline-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* Info Modal */}
      {infoModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
          onClick={closeInfo}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <button
                onClick={closeInfo}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
              <h2 className="text-sm font-semibold text-gray-900 capitalize text-center flex-1 px-4 truncate">
                {infoModal.name}
              </h2>
              <div className="w-6" />
            </div>

            {/* GIF */}
            <div className="flex justify-center bg-gray-50 py-5">
              {infoImage ? (
                <img
                  src={infoImage}
                  alt={infoModal.name}
                  width={180}
                  height={180}
                  className="rounded-xl"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-[180px] h-[180px] flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="px-5 pb-6">
              {/* Muscle info */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full capitalize font-medium">
                  {infoModal.bodyPart}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">
                  {infoModal.equipment}
                </span>
                {infoModal.secondaryMuscles?.slice(0, 2).map((m) => (
                  <span
                    key={m}
                    className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full capitalize"
                  >
                    {m}
                  </span>
                ))}
              </div>

              {/* Instructions */}
              {infoModal.instructions?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Instructions
                  </h3>
                  <ol className="space-y-3">
                    {infoModal.instructions.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-xs font-bold text-gray-400 mt-0.5 flex-shrink-0 w-4">
                          {i + 1}.
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
