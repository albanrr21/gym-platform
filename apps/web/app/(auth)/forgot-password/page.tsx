"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);
    setLoading(true);

    try {
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${origin}/auth/reset`,
        },
      );
      if (resetError) {
        showToast(resetError.message, "error");
        return;
      }
      showToast("Password reset link sent. Check your email.", "success");
    } catch {
      showToast("Failed to send reset link.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Forgot password</h1>
      <p className="mb-6 text-sm text-gray-500">
        Enter your email and we&apos;ll send a reset link.
      </p>

      <form onSubmit={submit} noValidate>
        <label
          htmlFor="forgot-email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "forgot-email-error" : undefined}
          className={`w-full rounded-lg border px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black ${emailError ? "border-red-400" : "border-gray-300"}`}
          placeholder="you@example.com"
        />
        {emailError && (
          <p id="forgot-email-error" className="mt-1 text-xs text-red-600">
            {emailError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-[#c8ff00] px-4 py-2 font-semibold text-black hover:bg-[#d4ff33] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-black hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
