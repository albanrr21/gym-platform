"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { fetchJson, FetchJsonError } from "@/lib/http/fetchJson";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { safeStorage } from "@/lib/storage/safeStorage";
import type { WorkoutExerciseData, WorkoutSetData } from "@/lib/workout/types";

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

interface LastSet {
  weight_kg: number;
  reps: number;
}

type RestTimerKind = "set" | "exercise";

type RestTimerState = {
  kind: RestTimerKind;
  label: string;
  endsAt: number;
};

type WorkoutDraft = {
  exercises: WorkoutExerciseData[];
  notes: string;
  templateName: string;
  setRestSeconds: number;
  exerciseRestSeconds: number;
  savedAt: string;
};

function isMeaningfulDraft(draft: Pick<WorkoutDraft, "exercises" | "notes">) {
  return (
    draft.notes.trim().length > 0 ||
    draft.exercises.some(
      (exercise) =>
        exercise.name.trim().length > 0 ||
        exercise.sets.some(
          (set) =>
            set.completed ||
            (Number.isFinite(set.weight_kg) && set.weight_kg > 0),
        ),
    )
  );
}

let localIdCounter = 0;

function createLocalId(prefix: string) {
  localIdCounter += 1;
  return `${prefix}-${Date.now()}-${localIdCounter}`;
}

const emptySet = (): WorkoutSetData => ({
  clientId: createLocalId("set"),
  weight_kg: 0,
  reps: 10,
  rpe: 7,
  completed: false,
});

const emptyExercise = (name = ""): WorkoutExerciseData => ({
  clientId: createLocalId("exercise"),
  name,
  sets: [emptySet(), emptySet(), emptySet()],
});

function normalizeExerciseForState(
  exercise: WorkoutExerciseData,
): WorkoutExerciseData {
  return {
    ...exercise,
    clientId: exercise.clientId ?? createLocalId("exercise"),
    sets:
      exercise.sets.length > 0
        ? exercise.sets.map((set) => ({
            clientId: set.clientId ?? createLocalId("set"),
            weight_kg: Number.isFinite(set.weight_kg) ? set.weight_kg : 0,
            reps: Number.isFinite(set.reps) ? set.reps : 10,
            rpe:
              typeof set.rpe === "number" && Number.isFinite(set.rpe)
                ? set.rpe
                : 7,
            completed: Boolean(set.completed),
          }))
        : [emptySet()],
  };
}

function parseNumberInput(raw: string, parser: (value: string) => number) {
  if (raw.trim() === "") return Number.NaN;
  return parser(raw);
}

function displayNumber(value: number) {
  return Number.isFinite(value) ? value : "";
}

function sanitizeExercisesForSave(exercises: WorkoutExerciseData[]) {
  return exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => ({
      ...set,
      weight_kg: Number.isFinite(set.weight_kg) ? set.weight_kg : 0,
      reps: Number.isFinite(set.reps) ? set.reps : 0,
    })),
  }));
}

function formatRestTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function LogWorkoutForm({
  gymId,
  initialExerciseName = "",
  initialExercises,
  initialNotes = "",
  initialTemplateName = "",
  initialSetRestSeconds = 90,
  initialExerciseRestSeconds = 180,
}: {
  gymId: string;
  initialExerciseName?: string;
  initialExercises?: WorkoutExerciseData[];
  initialNotes?: string;
  initialTemplateName?: string;
  initialSetRestSeconds?: number;
  initialExerciseRestSeconds?: number;
}) {
  const initialExerciseList = initialExercises?.length
    ? initialExercises.map(normalizeExerciseForState)
    : [
        {
          ...emptyExercise(initialExerciseName.trim()),
          name: initialExerciseName.trim(),
        },
      ];

  const [exercises, setExercises] =
    useState<WorkoutExerciseData[]>(initialExerciseList);
  const [notes, setNotes] = useState(initialNotes);
  const [templateName, setTemplateName] = useState(initialTemplateName);
  const [templateNameError, setTemplateNameError] = useState<string | null>(
    null,
  );
  const [setRestSeconds, setSetRestSeconds] = useState(initialSetRestSeconds);
  const [exerciseRestSeconds, setExerciseRestSeconds] = useState(
    initialExerciseRestSeconds,
  );
  const [loading, setLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [searchResults, setSearchResults] = useState<ExerciseResult[][]>(
    Array.from({ length: initialExerciseList.length }, () => []),
  );
  const [searching, setSearching] = useState<boolean[]>(
    Array.from({ length: initialExerciseList.length }, () => false),
  );
  const [infoModal, setInfoModal] = useState<InfoModal | null>(null);
  const [infoImage, setInfoImage] = useState<string | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const [previousSetsByExercise, setPreviousSetsByExercise] = useState<
    Record<number, LastSet[]>
  >({});
  const [bestByExercise, setBestByExercise] = useState<Record<number, number>>(
    {},
  );
  const [prCelebrated, setPrCelebrated] = useState<Record<number, boolean>>(
    {},
  );
  const [highlightedResult, setHighlightedResult] = useState<
    Record<number, number>
  >({});
  const [searchedEmpty, setSearchedEmpty] = useState<boolean[]>(
    Array.from({ length: initialExerciseList.length }, () => false),
  );
  const [draftPrompt, setDraftPrompt] = useState<WorkoutDraft | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRemoveExercise, setConfirmRemoveExercise] = useState<
    number | null
  >(null);
  const router = useRouter();
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const originalTitleRef = useRef<string | null>(null);
  const initialSnapshotRef = useRef(
    JSON.stringify({ exercises: initialExerciseList, notes: initialNotes }),
  );

  const draftKey = `workout-draft:${gymId}`;
  const timerKey = `${draftKey}:timer`;
  const hasInitialContent = Boolean(
    initialExercises?.length || initialExerciseName.trim(),
  );

  const isDirty =
    JSON.stringify({ exercises, notes }) !== initialSnapshotRef.current;

  function ensureNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission().catch(() => {});
    }
  }

  function warmUpAudio() {
    try {
      audioContextRef.current ??= new AudioContext();
      if (audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume();
      }
    } catch {
      // audio unsupported; timer stays silent
    }
  }

  function playBeep() {
    try {
      const ctx = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.7);
    } catch {
      // audio unsupported; timer stays silent
    }
  }

  function notifyRestOver(label: string) {
    playBeep();
    if (typeof navigator !== "undefined") {
      navigator.vibrate?.([200, 100, 200]);
    }
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification("Rest over", { body: label });
      } catch {
        // notifications blocked at OS level
      }
    }
  }

  function clearRestTimer() {
    setRestTimer(null);
  }

  function startRestTimer(kind: RestTimerKind, label: string, seconds: number) {
    if (seconds <= 0) {
      clearRestTimer();
      return;
    }

    ensureNotificationPermission();
    warmUpAudio();
    setTimerNow(Date.now());
    setRestTimer({ kind, label, endsAt: Date.now() + seconds * 1000 });
  }

  function extendRestTimer(seconds: number) {
    setRestTimer((current) =>
      current
        ? {
            ...current,
            endsAt: Math.max(current.endsAt, Date.now()) + seconds * 1000,
          }
        : current,
    );
  }

  const restSecondsRemaining = restTimer
    ? Math.max(0, Math.ceil((restTimer.endsAt - timerNow) / 1000))
    : 0;

  // Tick while a timer runs; fire the alert exactly once when it expires.
  useEffect(() => {
    if (!restTimer) return;

    const interval = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 500);

    return () => window.clearInterval(interval);
  }, [restTimer]);

  useEffect(() => {
    if (!restTimer) return;
    if (restTimer.endsAt - timerNow > 0) return;

    notifyRestOver(restTimer.label);
    setRestTimer(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimer, timerNow]);

  // Persist the running timer so a reload resumes the countdown.
  useEffect(() => {
    if (restTimer) {
      safeStorage.set(timerKey, JSON.stringify(restTimer));
    } else {
      safeStorage.remove(timerKey);
    }
  }, [restTimer, timerKey]);

  // Mirror the countdown in the tab title.
  useEffect(() => {
    if (restTimer) {
      originalTitleRef.current ??= document.title;
      document.title = `${formatRestTime(restSecondsRemaining)} · Rest`;
      return;
    }
    if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = null;
    }
  }, [restTimer, restSecondsRemaining]);

  // Restore a persisted draft prompt and running timer on mount.
  useEffect(() => {
    try {
      const storedTimer = safeStorage.get(timerKey);
      if (storedTimer) {
        const parsed = JSON.parse(storedTimer) as RestTimerState;
        if (parsed.endsAt > Date.now()) {
          setTimerNow(Date.now());
          setRestTimer(parsed);
        } else {
          safeStorage.remove(timerKey);
        }
      }

      if (!hasInitialContent) {
        const storedDraft = safeStorage.get(draftKey);
        if (storedDraft) {
          const parsed = JSON.parse(storedDraft) as WorkoutDraft;
          if (
            Array.isArray(parsed.exercises) &&
            isMeaningfulDraft(parsed)
          ) {
            setDraftPrompt(parsed);
          } else {
            safeStorage.remove(draftKey);
          }
        }
      }
    } catch {
      // corrupted draft; start fresh
      safeStorage.remove(draftKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistDraft = useDebouncedCallback(
    (draft: Omit<WorkoutDraft, "savedAt">) => {
      if (!isMeaningfulDraft(draft)) return;
      safeStorage.set(
        draftKey,
        JSON.stringify({
          ...draft,
          savedAt: new Date().toISOString(),
        } satisfies WorkoutDraft),
      );
    },
    800,
  );

  useEffect(() => {
    if (draftPrompt) return; // don't overwrite an unanswered draft
    persistDraft({
      exercises,
      notes,
      templateName,
      setRestSeconds,
      exerciseRestSeconds,
    });
  }, [
    exercises,
    notes,
    templateName,
    setRestSeconds,
    exerciseRestSeconds,
    draftPrompt,
    persistDraft,
  ]);

  function clearDraft() {
    persistDraft.cancel();
    safeStorage.remove(draftKey);
    safeStorage.remove(timerKey);
  }

  function resumeDraft() {
    if (!draftPrompt) return;
    const restored = draftPrompt.exercises.map(normalizeExerciseForState);
    setExercises(restored);
    setNotes(draftPrompt.notes ?? "");
    setTemplateName(draftPrompt.templateName ?? "");
    setSetRestSeconds(draftPrompt.setRestSeconds ?? initialSetRestSeconds);
    setExerciseRestSeconds(
      draftPrompt.exerciseRestSeconds ?? initialExerciseRestSeconds,
    );
    setSearchResults(restored.map(() => []));
    setSearching(restored.map(() => false));
    setSearchedEmpty(restored.map(() => false));
    setDraftPrompt(null);
    restored.forEach((exercise, index) => {
      if (exercise.name.trim()) void loadPreviousSets(index, exercise.name);
    });
  }

  function discardDraft() {
    setDraftPrompt(null);
    clearDraft();
  }

  async function searchExercise(index: number, term: string) {
    if (term.length < 3) {
      setSearchResults((prev) => {
        const next = [...prev];
        next[index] = [];
        return next;
      });
      setSearchedEmpty((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
      return;
    }

    setSearching((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    try {
      const data = await fetchJson<{ exercises?: ExerciseResult[] }>(
        `/api/exercises/search?name=${encodeURIComponent(term)}`,
      );
      const results = data.exercises || [];
      setSearchResults((prev) => {
        const next = [...prev];
        next[index] = results;
        return next;
      });
      setSearchedEmpty((prev) => {
        const next = [...prev];
        next[index] = results.length === 0;
        return next;
      });
      setHighlightedResult((prev) => ({ ...prev, [index]: -1 }));
    } catch {
      setSearchResults((prev) => {
        const next = [...prev];
        next[index] = [];
        return next;
      });
      setSearchedEmpty((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    } finally {
      setSearching((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }
  }

  const debouncedSearch = useDebouncedCallback(searchExercise, 400);

  function closeSearch(index: number) {
    setSearchResults((prev) => {
      const next = [...prev];
      next[index] = [];
      return next;
    });
    setSearchedEmpty((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
    setHighlightedResult((prev) => ({ ...prev, [index]: -1 }));
  }

  // Close any open search dropdown when clicking outside of it.
  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-exercise-search]")) return;
      setSearchResults((prev) =>
        prev.some((results) => results.length > 0) ? prev.map(() => []) : prev,
      );
      setSearchedEmpty((prev) =>
        prev.some(Boolean) ? prev.map(() => false) : prev,
      );
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  async function loadPreviousSets(index: number, exerciseName: string) {
    const name = exerciseName.trim();
    if (!name) return;

    try {
      const data = await fetchJson<{
        sets: LastSet[];
        best_weight_kg?: number;
      }>(`/api/workouts/last-sets?exercise=${encodeURIComponent(name)}`);
      setPreviousSetsByExercise((prev) => ({
        ...prev,
        [index]: data.sets ?? [],
      }));
      setBestByExercise((prev) => ({
        ...prev,
        [index]: data.best_weight_kg ?? 0,
      }));
    } catch {
      setPreviousSetsByExercise((prev) => ({ ...prev, [index]: [] }));
      setBestByExercise((prev) => ({ ...prev, [index]: 0 }));
    }
  }

  function selectExercise(index: number, result: ExerciseResult) {
    setExercises((prev) =>
      prev.map((exercise, exerciseIndex) =>
        exerciseIndex === index
          ? {
              ...exercise,
              name: result.name,
              exerciseId: result.id,
              bodyPart: result.bodyPart,
              equipment: result.equipment,
              secondaryMuscles: result.secondaryMuscles,
              instructions: result.instructions,
            }
          : exercise,
      ),
    );

    setSearchResults((prev) => {
      const next = [...prev];
      next[index] = [];
      return next;
    });
    setSearchedEmpty((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });

    void loadPreviousSets(index, result.name);
  }

  function addExercise() {
    setExercises((prev) => [...prev, emptyExercise()]);
    setSearchResults((prev) => [...prev, []]);
    setSearching((prev) => [...prev, false]);
    setSearchedEmpty((prev) => [...prev, false]);
  }

  function reindexRecord<T>(record: Record<number, T>, removedIndex: number) {
    const next: Record<number, T> = {};
    Object.entries(record).forEach(([key, value]) => {
      const exerciseIndex = Number(key);
      if (exerciseIndex < removedIndex) next[exerciseIndex] = value;
      if (exerciseIndex > removedIndex) next[exerciseIndex - 1] = value;
    });
    return next;
  }

  function performRemoveExercise(index: number) {
    setExercises((prev) =>
      prev.filter((_, exerciseIndex) => exerciseIndex !== index),
    );
    setSearchResults((prev) =>
      prev.filter((_, exerciseIndex) => exerciseIndex !== index),
    );
    setSearching((prev) =>
      prev.filter((_, exerciseIndex) => exerciseIndex !== index),
    );
    setSearchedEmpty((prev) =>
      prev.filter((_, exerciseIndex) => exerciseIndex !== index),
    );
    setPreviousSetsByExercise((prev) => reindexRecord(prev, index));
    setBestByExercise((prev) => reindexRecord(prev, index));
    setPrCelebrated((prev) => reindexRecord(prev, index));
    setHighlightedResult((prev) => reindexRecord(prev, index));
  }

  function removeExercise(index: number) {
    const exercise = exercises[index];
    const hasLoggedData = Boolean(
      exercise &&
        exercise.sets.some(
          (set) =>
            set.completed ||
            (Number.isFinite(set.weight_kg) && set.weight_kg > 0),
        ),
    );

    if (hasLoggedData) {
      setConfirmRemoveExercise(index);
      return;
    }

    performRemoveExercise(index);
  }

  function updateExerciseName(index: number, value: string) {
    setExercises((prev) =>
      prev.map((exercise, exerciseIndex) =>
        exerciseIndex === index
          ? {
              ...exercise,
              name: value,
              exerciseId: undefined,
              bodyPart: undefined,
              equipment: undefined,
            }
          : exercise,
      ),
    );
    setPreviousSetsByExercise((prev) => ({ ...prev, [index]: [] }));
  }

  useEffect(() => {
    if (!initialExerciseName.trim()) return;
    void loadPreviousSets(0, initialExerciseName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addSet(exerciseIndex: number) {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exerciseIndex
          ? { ...exercise, sets: [...exercise.sets, emptySet()] }
          : exercise,
      ),
    );
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.filter((_, current) => current !== setIndex),
            }
          : exercise,
      ),
    );
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    field: keyof WorkoutSetData,
    value: number | boolean,
  ) {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, current) =>
                current === setIndex ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    );
  }

  function toggleSet(exerciseIndex: number, setIndex: number) {
    const exercise = exercises[exerciseIndex];
    const currentSet = exercise?.sets[setIndex];
    if (!exercise || !currentSet) return;

    const isMarkingComplete = !currentSet.completed;

    setExercises((prev) =>
      prev.map((item, index) =>
        index === exerciseIndex
          ? {
              ...item,
              sets: item.sets.map((set, current) =>
                current === setIndex
                  ? { ...set, completed: !set.completed }
                  : set,
              ),
            }
          : item,
      ),
    );

    if (!isMarkingComplete) {
      clearRestTimer();
      return;
    }

    const bestWeight = bestByExercise[exerciseIndex] ?? 0;
    if (
      bestWeight > 0 &&
      Number.isFinite(currentSet.weight_kg) &&
      currentSet.weight_kg > bestWeight &&
      !prCelebrated[exerciseIndex]
    ) {
      setPrCelebrated((prev) => ({ ...prev, [exerciseIndex]: true }));
      showToast(
        `New ${exercise.name || "exercise"} PR: ${currentSet.weight_kg}kg 🎉`,
        "success",
      );
    }

    const nextSet = exercise.sets[setIndex + 1];
    const nextExercise = exercises[exerciseIndex + 1];

    if (nextSet) {
      startRestTimer(
        "set",
        `Next set: ${exercise.name || "exercise"} ${setIndex + 2}`,
        setRestSeconds,
      );
      return;
    }

    if (nextExercise) {
      startRestTimer(
        "exercise",
        `Next exercise: ${nextExercise.name || "exercise"}`,
        exerciseRestSeconds,
      );
      return;
    }

    clearRestTimer();
  }

  function openInfo(exercise: WorkoutExerciseData) {
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

  useEffect(() => {
    if (!infoModal) {
      if (previouslyFocused.current) {
        try {
          previouslyFocused.current.focus();
        } catch {
          // ignore focus restore issues
        }
        previouslyFocused.current = null;
      }
      return;
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const timer = window.setTimeout(() => {
      modalRef.current?.focus();
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeInfo();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [infoModal]);

  function formatPreviousSet(exerciseIndex: number, setIndex: number) {
    const previous = previousSetsByExercise[exerciseIndex]?.[setIndex];
    if (!previous) return "-";
    return `${previous.weight_kg} x ${previous.reps}`;
  }

  function validateWorkout() {
    if (exercises.some((exercise) => !exercise.name.trim())) {
      return "All exercises must have a name.";
    }

    if (exercises.some((exercise) => exercise.sets.length === 0)) {
      return "Each exercise must have at least one set.";
    }

    return null;
  }

  async function saveWorkoutHistory({
    showSuccessToast = true,
    navigateAfterSave = false,
  }: {
    showSuccessToast?: boolean;
    navigateAfterSave?: boolean;
  } = {}) {
    if (loading) return false;

    const validationError = validateWorkout();
    if (validationError) {
      showToast(validationError, "error");
      return false;
    }

    setLoading(true);
    try {
      await fetchJson<{ workout: { id: string } }>("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercises: sanitizeExercisesForSave(exercises),
          notes,
          gym_id: gymId,
        }),
      });

      clearRestTimer();
      clearDraft();
      if (showSuccessToast) {
        showToast("Workout saved.", "success");
      }

      if (navigateAfterSave) {
        router.push("/dashboard");
        router.refresh();
      }

      return true;
    } catch (error) {
      if (error instanceof FetchJsonError) {
        showToast(error.message, "error");
      } else {
        showToast(
          "Unable to save workout. Check your connection and try again.",
          "error",
        );
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function saveTemplateRecord() {
    try {
      await fetchJson<{ ok: boolean }>("/api/workout-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          notes,
          set_rest_seconds: setRestSeconds,
          exercise_rest_seconds: exerciseRestSeconds,
          exercises: sanitizeExercisesForSave(exercises),
        }),
      });
      return true;
    } catch (error) {
      if (error instanceof FetchJsonError) {
        showToast(error.message, "error");
      } else {
        showToast("Unable to save template. Try again.", "error");
      }
      return false;
    }
  }

  async function handleSubmit() {
    if (loading || savingTemplate) return;
    const workoutSaved = await saveWorkoutHistory({
      showSuccessToast: true,
      navigateAfterSave: true,
    });
    if (!workoutSaved) return;
  }

  async function saveTemplate() {
    if (loading || savingTemplate) return;

    const validationError = validateWorkout();
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    if (!templateName.trim()) {
      setTemplateNameError("Give the template a name before saving.");
      showToast("Template name is required.", "error");
      document.getElementById("template-name")?.focus();
      return;
    }
    setTemplateNameError(null);

    setSavingTemplate(true);
    try {
      const templateSaved = await saveTemplateRecord();
      if (templateSaved) {
        showToast("Template saved.", "success");
      }
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => {
              if (isDirty) {
                setConfirmCancel(true);
              } else {
                clearDraft();
                router.back();
              }
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <h1 className="text-sm font-semibold text-gray-900">Log Workout</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={saveTemplate}
              disabled={loading || savingTemplate}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingTemplate ? "Saving template..." : "Save template"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || savingTemplate}
              className="text-sm font-semibold text-black disabled:opacity-40"
            >
              {loading ? "Saving..." : "Finish"}
            </button>
          </div>
        </div>

        {restTimer && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">
                  {restTimer.kind === "set"
                    ? "Rest between sets"
                    : "Rest between exercises"}
                </p>
                <p className="text-xs text-gray-500">{restTimer.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-live="off"
                  className="font-mono text-lg font-semibold text-gray-900"
                >
                  {formatRestTime(restSecondsRemaining)}
                </span>
                <button
                  onClick={() => extendRestTimer(30)}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-white"
                >
                  +30s
                </button>
                <button
                  onClick={clearRestTimer}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-white"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        {draftPrompt && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Resume your unsaved workout?
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Saved{" "}
              {new Date(draftPrompt.savedAt).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" · "}
              {draftPrompt.exercises.length} exercise
              {draftPrompt.exercises.length !== 1 ? "s" : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={resumeDraft}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Resume workout
              </button>
              <button
                onClick={discardDraft}
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Rest timers</h2>
            <p className="text-xs text-gray-500">
              Start a countdown automatically when you mark a set complete.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="rest-between-sets"
                className="mb-1 block text-xs font-medium text-gray-500"
              >
                Between sets (seconds)
              </label>
              <input
                id="rest-between-sets"
                type="number"
                min={0}
                step={1}
                value={setRestSeconds}
                onChange={(event) =>
                  setSetRestSeconds(
                    Math.max(0, Number.parseInt(event.target.value, 10) || 0),
                  )
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
              />
            </div>
            <div>
              <label
                htmlFor="rest-between-exercises"
                className="mb-1 block text-xs font-medium text-gray-500"
              >
                Between exercises (seconds)
              </label>
              <input
                id="rest-between-exercises"
                type="number"
                min={0}
                step={1}
                value={exerciseRestSeconds}
                onChange={(event) =>
                  setExerciseRestSeconds(
                    Math.max(0, Number.parseInt(event.target.value, 10) || 0),
                  )
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {exercises.map((exercise, exerciseIndex) => (
          <div
            key={exercise.clientId}
            className="rounded-xl border border-gray-200 bg-white"
          >
            <div className="space-y-3 px-4 pt-4 pb-3">
              <div className="flex items-start gap-2">
                <div className="relative flex-1" data-exercise-search>
                  <label
                    htmlFor={`exercise-${exerciseIndex}`}
                    className="sr-only"
                  >
                    Exercise name
                  </label>
                  <input
                    id={`exercise-${exerciseIndex}`}
                    type="text"
                    placeholder="Search exercise..."
                    value={exercise.name}
                    role="combobox"
                    aria-expanded={searchResults[exerciseIndex]?.length > 0}
                    aria-controls={`exercise-${exerciseIndex}-listbox`}
                    aria-autocomplete="list"
                    aria-activedescendant={
                      (highlightedResult[exerciseIndex] ?? -1) >= 0
                        ? `exercise-${exerciseIndex}-option-${highlightedResult[exerciseIndex]}`
                        : undefined
                    }
                    onChange={(event) => {
                      updateExerciseName(exerciseIndex, event.target.value);
                      debouncedSearch(exerciseIndex, event.target.value);
                    }}
                    onKeyDown={(event) => {
                      const results = searchResults[exerciseIndex] ?? [];
                      if (event.key === "Escape") {
                        closeSearch(exerciseIndex);
                        return;
                      }
                      if (results.length === 0) return;
                      const current = highlightedResult[exerciseIndex] ?? -1;

                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setHighlightedResult((prev) => ({
                          ...prev,
                          [exerciseIndex]: (current + 1) % results.length,
                        }));
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setHighlightedResult((prev) => ({
                          ...prev,
                          [exerciseIndex]:
                            current <= 0 ? results.length - 1 : current - 1,
                        }));
                      } else if (event.key === "Enter" && current >= 0) {
                        event.preventDefault();
                        selectExercise(exerciseIndex, results[current]);
                      }
                    }}
                    className="w-full border-none bg-transparent text-sm font-semibold text-blue-600 outline-none placeholder-gray-400"
                  />

                  {searchResults[exerciseIndex]?.length > 0 && (
                    <div
                      id={`exercise-${exerciseIndex}-listbox`}
                      role="listbox"
                      aria-label="Exercise suggestions"
                      className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg"
                    >
                      {searchResults[exerciseIndex].map(
                        (result, resultIndex) => (
                          <button
                            key={result.id}
                            id={`exercise-${exerciseIndex}-option-${resultIndex}`}
                            type="button"
                            role="option"
                            aria-selected={
                              highlightedResult[exerciseIndex] === resultIndex
                            }
                            onClick={() =>
                              selectExercise(exerciseIndex, result)
                            }
                            onMouseEnter={() =>
                              setHighlightedResult((prev) => ({
                                ...prev,
                                [exerciseIndex]: resultIndex,
                              }))
                            }
                            className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-2.5 text-left last:border-0 ${
                              highlightedResult[exerciseIndex] === resultIndex
                                ? "bg-gray-50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium capitalize text-gray-800">
                                {result.name}
                              </p>
                              <p className="text-xs capitalize text-gray-500">
                                {result.bodyPart} / {result.equipment}
                              </p>
                            </div>
                          </button>
                        ),
                      )}
                    </div>
                  )}

                  {searchedEmpty[exerciseIndex] &&
                    !searching[exerciseIndex] &&
                    exercise.name.trim().length >= 3 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-500 shadow-lg">
                        No exercises found. You can keep the name you typed.
                      </div>
                    )}

                  {searching[exerciseIndex] && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
                      Searching...
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {exercise.exerciseId && (
                    <button
                      type="button"
                      onClick={() => openInfo(exercise)}
                      aria-label={`Open exercise info for ${exercise.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100"
                    >
                      <span className="text-[11px] font-bold">i</span>
                    </button>
                  )}
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExercise(exerciseIndex)}
                      aria-label="Remove exercise"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100"
                    >
                      <svg
                        aria-hidden="true"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {exercise.exerciseId && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-500">
                    {exercise.bodyPart}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-500">
                    {exercise.equipment}
                  </span>
                </div>
              )}
            </div>

            <div className="hidden border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 sm:block">
              <div className="grid grid-cols-12 gap-2 text-center">
                <span className="col-span-1">Set</span>
                <span className="col-span-3">Previous</span>
                <span className="col-span-3">kg</span>
                <span className="col-span-3">Reps</span>
                <span className="col-span-2">Done</span>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {exercise.sets.map((set, setIndex) => (
                <div
                  key={set.clientId}
                  className={`grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-12 sm:gap-2 ${set.completed ? "bg-green-50" : "bg-white"}`}
                >
                  <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:justify-center">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${set.completed ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}
                      >
                        {setIndex + 1}
                      </span>
                      {set.completed &&
                        (bestByExercise[exerciseIndex] ?? 0) > 0 &&
                        Number.isFinite(set.weight_kg) &&
                        set.weight_kg > bestByExercise[exerciseIndex] && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            PR
                          </span>
                        )}
                    </span>
                    <span className="text-xs text-gray-500 sm:hidden">
                      Previous: {formatPreviousSet(exerciseIndex, setIndex)}
                    </span>
                  </div>

                  <div className="hidden items-center justify-center text-xs text-gray-500 sm:col-span-3 sm:flex">
                    {formatPreviousSet(exerciseIndex, setIndex)}
                  </div>

                  <div className="col-span-1 sm:col-span-3">
                    <label className="mb-1 block text-[11px] font-medium text-gray-500 sm:hidden">
                      kg
                    </label>
                    <input
                      aria-label={`Set ${setIndex + 1} weight in kilograms`}
                      type="number"
                      value={displayNumber(set.weight_kg)}
                      min={0}
                      step={0.5}
                      onChange={(event) =>
                        updateSet(
                          exerciseIndex,
                          setIndex,
                          "weight_kg",
                          parseNumberInput(
                            event.target.value,
                            Number.parseFloat,
                          ),
                        )
                      }
                      onBlur={() => {
                        if (!Number.isFinite(set.weight_kg)) {
                          updateSet(exerciseIndex, setIndex, "weight_kg", 0);
                        }
                      }}
                      className={`w-full rounded-lg border px-2 py-1.5 text-center text-sm font-medium outline-none focus:ring-2 focus:ring-black ${set.completed ? "border-green-200 bg-green-100 text-green-800" : "border-gray-200 bg-white text-gray-800"}`}
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-3">
                    <label className="mb-1 block text-[11px] font-medium text-gray-500 sm:hidden">
                      Reps
                    </label>
                    <input
                      aria-label={`Set ${setIndex + 1} reps`}
                      type="number"
                      value={displayNumber(set.reps)}
                      min={0}
                      onChange={(event) =>
                        updateSet(
                          exerciseIndex,
                          setIndex,
                          "reps",
                          parseNumberInput(event.target.value, (value) =>
                            Number.parseInt(value, 10),
                          ),
                        )
                      }
                      onBlur={() => {
                        if (!Number.isFinite(set.reps)) {
                          updateSet(exerciseIndex, setIndex, "reps", 0);
                        }
                      }}
                      className={`w-full rounded-lg border px-2 py-1.5 text-center text-sm font-medium outline-none focus:ring-2 focus:ring-black ${set.completed ? "border-green-200 bg-green-100 text-green-800" : "border-gray-200 bg-white text-gray-800"}`}
                    />
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-2 sm:justify-center">
                    <button
                      type="button"
                      onClick={() => toggleSet(exerciseIndex, setIndex)}
                      aria-label={`Mark set ${setIndex + 1} as ${set.completed ? "not completed" : "completed"}`}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${set.completed ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
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
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                      disabled={exercise.sets.length <= 1}
                      aria-label="Remove set"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-400 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <svg
                        aria-hidden="true"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4 pt-2">
              <button
                type="button"
                onClick={() => addSet(exerciseIndex)}
                aria-label={`Add set to ${exercise.name || "exercise"}`}
                className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100"
              >
                + Add Set
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addExercise}
          aria-label="Add exercise"
          className="w-full rounded-xl border border-dashed border-gray-300 bg-white py-3 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
        >
          + Add Exercise
        </button>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <label
            htmlFor="workout-notes"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Notes (optional)
          </label>
          <textarea
            id="workout-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="How did the session feel?"
            className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 outline-none"
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Workout template
            </h2>
            <p className="text-xs text-gray-500">
              Save this exercise structure, notes, and rest settings for later.
            </p>
          </div>
          <div>
            <label
              htmlFor="template-name"
              className="mb-1 block text-xs font-medium text-gray-500"
            >
              Template name
            </label>
            <input
              id="template-name"
              type="text"
              value={templateName}
              onChange={(event) => {
                setTemplateName(event.target.value);
                if (templateNameError) setTemplateNameError(null);
              }}
              placeholder="Push day template"
              aria-invalid={templateNameError ? true : undefined}
              aria-describedby={
                templateNameError ? "template-name-error" : undefined
              }
              className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none focus:border-black ${templateNameError ? "border-red-400" : "border-gray-200"}`}
            />
            {templateNameError && (
              <p id="template-name-error" className="mt-1 text-xs text-red-600">
                {templateNameError}
              </p>
            )}
          </div>
        </div>

        <div className="h-4" />
      </div>

      {infoModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={closeInfo}
          role="dialog"
          aria-modal="true"
          aria-label={`Exercise info: ${infoModal.name}`}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 pb-3 pt-5">
              <button
                type="button"
                onClick={closeInfo}
                className="text-sm text-gray-500 hover:text-gray-600"
              >
                Close
              </button>
              <h2 className="flex-1 truncate px-4 text-center text-sm font-semibold capitalize text-gray-900">
                {infoModal.name}
              </h2>
              <div className="w-6" />
            </div>

            <div className="flex justify-center bg-gray-50 py-5">
              {infoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={infoImage}
                  alt={infoModal.name}
                  width={180}
                  height={180}
                  className="rounded-xl"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-[180px] w-[180px] items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
                </div>
              )}
            </div>

            <div className="px-5 pb-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-600">
                  {infoModal.bodyPart}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs capitalize text-gray-600">
                  {infoModal.equipment}
                </span>
                {infoModal.secondaryMuscles?.slice(0, 2).map((muscle) => (
                  <span
                    key={muscle}
                    className="rounded-full bg-gray-100 px-2.5 py-1 text-xs capitalize text-gray-500"
                  >
                    {muscle}
                  </span>
                ))}
              </div>

              {infoModal.instructions?.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Instructions
                  </h3>
                  <ol className="space-y-3">
                    {infoModal.instructions.map((step, index) => (
                      <li
                        key={`${infoModal.exerciseId}-${index}`}
                        className="flex gap-3"
                      >
                        <span className="mt-0.5 w-4 flex-shrink-0 text-xs font-bold text-gray-500">
                          {index + 1}.
                        </span>
                        <p className="text-sm leading-relaxed text-gray-700">
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

      <ConfirmDialog
        open={confirmCancel}
        title="Discard this workout?"
        body="Your logged sets and notes will be lost."
        confirmLabel="Discard workout"
        cancelLabel="Keep logging"
        destructive
        onConfirm={() => {
          setConfirmCancel(false);
          clearDraft();
          router.back();
        }}
        onCancel={() => setConfirmCancel(false)}
      />

      <ConfirmDialog
        open={confirmRemoveExercise !== null}
        title="Remove this exercise?"
        body="It has logged sets that will be lost."
        confirmLabel="Remove exercise"
        destructive
        onConfirm={() => {
          if (confirmRemoveExercise !== null) {
            performRemoveExercise(confirmRemoveExercise);
          }
          setConfirmRemoveExercise(null);
        }}
        onCancel={() => setConfirmRemoveExercise(null)}
      />
    </div>
  );
}
