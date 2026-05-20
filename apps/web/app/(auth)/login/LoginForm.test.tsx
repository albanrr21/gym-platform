import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import LoginForm from "./LoginForm";
import { ToastProvider } from "../../../components/ui/Toast";

const signInWithPassword = vi.fn();
const usersSelectSingle = vi.fn();
const gymsSelectSingle = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: table === "users" ? usersSelectSingle : gymsSelectSingle,
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/tenancy/subdomain", () => ({
  buildGymBaseUrl: () => "http://elite.localhost:3000",
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  function renderForm() {
    return render(
      <ToastProvider>
        <LoginForm />
      </ToastProvider>,
    );
  }

  it("shows validation error for invalid email", async () => {
    renderForm();
    fireEvent.change(screen.getAllByPlaceholderText("you@example.com")[0], {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid email address."),
      ).toBeInTheDocument();
    });
  });

  it("shows error message when login fails", async () => {
    signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: "Invalid login credentials" },
    });
    renderForm();
    fireEvent.change(screen.getAllByPlaceholderText("you@example.com")[0], {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });
  });

  it("disables button during loading", async () => {
    let release: () => void = () => {};
    signInWithPassword.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              data: { session: null, user: null },
              error: { message: "Invalid login credentials" },
            });
        }),
    );

    renderForm();
    fireEvent.change(screen.getAllByPlaceholderText("you@example.com")[0], {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
    });
    release();
  });
});
