import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "History",
};

type SearchParams = Record<string, string | string[] | undefined>;

type WorkoutRow = {
  id: string;
  logged_at: string;
  notes: string | null;
  exercises: { id: string; name: string | null }[] | null;
};

const PAGE_SIZE = 20;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await Promise.resolve(searchParams ?? {});
  const pageRaw = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const dateFrom = typeof params.from === "string" ? params.from : "";
  const dateTo = typeof params.to === "string" ? params.to : "";
  const exerciseQuery = typeof params.exercise === "string" ? params.exercise : "";

  let query = supabase
    .from("workouts")
    .select("id, logged_at, notes, exercises(id, name)")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(500);

  if (dateFrom) {
    query = query.gte("logged_at", new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    query = query.lte("logged_at", end.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error.message}
        </div>
      </div>
    );
  }

  const normalizedExerciseQuery = exerciseQuery.trim().toLowerCase();
  const filtered = ((data ?? []) as WorkoutRow[]).filter((workout) => {
    if (!normalizedExerciseQuery) return true;
    return (workout.exercises ?? []).some((ex) =>
      (ex.name ?? "").toLowerCase().includes(normalizedExerciseQuery),
    );
  });

  const hasFilters = Boolean(dateFrom || dateTo || exerciseQuery);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;
  const rows = filtered.slice(offset, offset + PAGE_SIZE);

  function makeHref(nextPage: number) {
    const q = new URLSearchParams();
    if (dateFrom) q.set("from", dateFrom);
    if (dateTo) q.set("to", dateTo);
    if (exerciseQuery) q.set("exercise", exerciseQuery);
    q.set("page", String(nextPage));
    return `/dashboard/history?${q.toString()}`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Workout History</h1>
        <p className="text-sm text-gray-500">Browse all logged workouts.</p>
      </div>

      <form className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
        <div>
          <label
            htmlFor="history-from"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            From
          </label>
          <input
            id="history-from"
            type="date"
            name="from"
            defaultValue={dateFrom}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="history-to"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            To
          </label>
          <input
            id="history-to"
            type="date"
            name="to"
            defaultValue={dateTo}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="history-exercise"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Exercise
          </label>
          <input
            id="history-exercise"
            type="text"
            name="exercise"
            defaultValue={exerciseQuery}
            placeholder="bench, squat, deadlift..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <input type="hidden" name="page" value="1" />
        <div className="flex items-center gap-3 sm:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-[var(--theme-brand)] px-4 py-2 text-sm font-medium text-[var(--theme-brand-foreground)] hover:opacity-90"
          >
            Apply filters
          </button>
          {hasFilters && (
            <Link
              href="/dashboard/history"
              className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            {hasFilters ? (
              "No workouts match your filters."
            ) : (
              <>
                No workouts logged yet.{" "}
                <Link
                  href="/dashboard/log"
                  className="font-medium text-gray-900 hover:underline"
                >
                  Log your first workout
                </Link>
              </>
            )}
          </div>
        ) : (
          rows.map((workout) => (
            <Link
              key={workout.id}
              href={`/dashboard/workouts/${workout.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {(workout.exercises ?? []).length} exercise
                  {(workout.exercises ?? []).length !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(workout.logged_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(workout.exercises ?? []).map((ex) => (
                  <span
                    key={ex.id}
                    className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                  >
                    {ex.name}
                  </span>
                ))}
              </div>
              {workout.notes && (
                <p className="mt-2 text-xs italic text-gray-500">{workout.notes}</p>
              )}
            </Link>
          ))
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Link
          href={makeHref(Math.max(1, safePage - 1))}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            safePage <= 1
              ? "pointer-events-none border-gray-100 text-gray-300"
              : "border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Previous
        </Link>
        <span className="text-sm text-gray-500">
          Page {safePage} of {totalPages}
        </span>
        <Link
          href={makeHref(Math.min(totalPages, safePage + 1))}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            safePage >= totalPages
              ? "pointer-events-none border-gray-100 text-gray-300"
              : "border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
