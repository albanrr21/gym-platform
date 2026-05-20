"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function submit() {
    if (loading) return;
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

      {/* messages replaced by toasts */}

      <label className="mb-1 block text-sm font-medium text-gray-700">
        Email
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black"
        placeholder="you@example.com"
      />

      <button
        onClick={submit}
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>

      <p className="mt-5 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-black hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
