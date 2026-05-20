"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function bootstrapFromHash() {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setReady(true);
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        showToast("Invalid or expired reset link.", "error");
      }

      setReady(true);
    }

    bootstrapFromHash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase.auth]);

  async function submit() {
    if (loading) return;
    // errors are surfaced via toast

    if (password.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        showToast(updateError.message, "error");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      showToast("Failed to reset password.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Reset password</h1>
      <p className="mb-6 text-sm text-gray-500">Choose a new password.</p>

      {/* Errors shown via toasts */}

      <label className="mb-1 block text-sm font-medium text-gray-700">
        New password
      </label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black"
      />

      <button
        onClick={submit}
        disabled={loading || !ready}
        className="mt-4 w-full rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Updating..." : "Update password"}
      </button>
    </div>
  );
}
