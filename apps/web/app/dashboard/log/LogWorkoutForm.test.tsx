import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LogWorkoutForm from "./LogWorkoutForm";
import { ToastProvider } from "../../../components/ui/Toast";

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

describe("LogWorkoutForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  function renderForm() {
    return render(
      <ToastProvider>
        <LogWorkoutForm gymId="00000000-0000-0000-0000-000000000000" />
      </ToastProvider>,
    );
  }

  it("clears loading and shows an error when the save request fails", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Network down"));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderForm();

    fireEvent.change(screen.getAllByPlaceholderText("Search exercise...")[0], {
      target: { value: "Ab" },
    });

    const finishButton = screen.getByRole("button", { name: "Finish" });
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to save workout. Check your connection and try again.",
        ),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Finish" })).not.toBeDisabled();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/workouts",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("validates that exercise name is required before submit", async () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    renderForm();

    fireEvent.change(screen.getAllByPlaceholderText("Search exercise...")[0], {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() => {
      expect(
        screen.getByText("All exercises must have a name."),
      ).toBeInTheDocument();
    });
  });

  it("adds a set when the add-set control is clicked", () => {
    renderForm();
    const addSetButton = screen.getByRole("button", { name: /add set/i });
    fireEvent.click(addSetButton);

    // The component renders duplicate DOM nodes for responsive layouts
    // (desktop + mobile). Count distinct set numbers from aria-labels.
    const weightInputs = screen.getAllByLabelText(
      /Set \d+ weight in kilograms/,
    );
    const setNums = new Set(
      weightInputs.map((el) => {
        const label = el.getAttribute("aria-label") || "";
        const m = label.match(/Set (\d+)/);
        return m ? m[1] : "";
      }),
    );
    expect(setNums.size).toBe(4);
  });

  it("removes an exercise when X is clicked", () => {
    renderForm();
    fireEvent.click(
      screen.getAllByRole("button", { name: /add exercise/i })[0],
    );
    const before = screen.getAllByPlaceholderText("Search exercise...");
    expect(before).toHaveLength(2);

    fireEvent.click(screen.getAllByLabelText("Remove exercise")[1]);
    const after = screen.getAllByPlaceholderText("Search exercise...");
    expect(after).toHaveLength(1);
  });

  it("disables the Finish button while loading", async () => {
    let resolveRequest: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn().mockImplementation(() => pending);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderForm();
    fireEvent.change(screen.getAllByPlaceholderText("Search exercise...")[0], {
      target: { value: "Bench Press" },
    });

    const finishButton = screen.getByRole("button", { name: "Finish" });
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    });

    resolveRequest();
  });

  it("starts a rest timer when a set is marked complete", () => {
    vi.useFakeTimers();

    renderForm();
    fireEvent.click(screen.getAllByLabelText(/Mark set 1 as completed/i)[0]);

    expect(screen.getByText("Rest between sets")).toBeInTheDocument();
    expect(screen.getByText("1:30")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("1:29")).toBeInTheDocument();
  });

  it("saves the workout setup as a template", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderForm();

    fireEvent.change(screen.getAllByPlaceholderText("Search exercise...")[0], {
      target: { value: "Bench Press" },
    });
    fireEvent.change(screen.getByLabelText(/template name/i), {
      target: { value: "Push day" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/workout-templates",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("saves only workout history when finishing with a template name", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ workout: { id: "workout-1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderForm();

    fireEvent.change(screen.getAllByPlaceholderText("Search exercise...")[0], {
      target: { value: "Bench Press" },
    });
    fireEvent.change(screen.getByLabelText(/template name/i), {
      target: { value: "Push day" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/workouts",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(router.push).toHaveBeenCalledWith("/dashboard?saved=workout");
  });

  it("does not save workout history when saving a template", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderForm();

    fireEvent.change(screen.getAllByPlaceholderText("Search exercise...")[0], {
      target: { value: "Bench Press" },
    });
    fireEvent.change(screen.getByLabelText(/template name/i), {
      target: { value: "Push day" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/workout-templates",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
