"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import PasswordInput from "@/components/ui/PasswordInput";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    setPasswordError(null);

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

      <form onSubmit={submit} noValidate>
        <label
          htmlFor="reset-password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          New password
        </label>
        <PasswordInput
          id="reset-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          invalid={Boolean(passwordError)}
          describedBy={passwordError ? "reset-password-error" : undefined}
        />
        {passwordError && (
          <p id="reset-password-error" className="mt-1 text-xs text-red-600">
            {passwordError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !ready}
          className="mt-4 w-full rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
