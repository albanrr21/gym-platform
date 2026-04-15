import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LogWorkoutForm from "./LogWorkoutForm";

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

describe("LogWorkoutForm", () => {
  it("clears loading and shows an error when the save request fails", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Network down"));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<LogWorkoutForm gymId="00000000-0000-0000-0000-000000000000" />);

    fireEvent.change(screen.getByPlaceholderText("Search exercise..."), {
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
});
