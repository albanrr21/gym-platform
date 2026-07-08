"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import PasswordInput from "@/components/ui/PasswordInput";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Props = {
  initialFullName: string;
  email: string;
  gymName: string;
  gymSubdomain: string;
};

export default function ProfileForm({
  initialFullName,
  email,
  gymName,
  gymSubdomain,
}: Props) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(initialFullName);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { showToast } = useToast();

  async function updateName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingName) return;
    setLoadingName(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(data.error ?? "Failed to update name.", "error");
        return;
      }
      showToast("Profile updated.", "success");
    } catch {
      showToast("Failed to update name.", "error");
    } finally {
      setLoadingName(false);
    }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingPassword) return;
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    setPasswordError(null);

    setLoadingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        showToast(updateError.message, "error");
        return;
      }
      setNewPassword("");
      showToast("Password updated.", "success");
    } catch {
      showToast("Failed to update password.", "error");
    } finally {
      setLoadingPassword(false);
    }
  }

  async function signOutEverywhere() {
    if (loadingSignOut) return;
    setLoadingSignOut(true);

    try {
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "global",
      });
      if (signOutError) {
        showToast(signOutError.message, "error");
        return;
      }
      showToast("Signed out from all devices.", "success");
      window.location.href = "/login";
    } catch {
      showToast("Failed to sign out from all devices.", "error");
    } finally {
      setLoadingSignOut(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Profile</h1>
        <p className="mb-4 text-sm text-gray-500">Manage account settings.</p>

        <div className="space-y-4">
          <form onSubmit={updateName}>
            <label
              htmlFor="profile-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Display name
            </label>
            <input
              id="profile-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              disabled={loadingName}
              className="mt-2 rounded-lg bg-[var(--theme-brand)] px-4 py-2 text-sm font-medium text-[var(--theme-brand-foreground)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingName ? "Saving..." : "Save name"}
            </button>
          </form>

          <div>
            <label
              htmlFor="profile-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
            />
          </div>

          <form onSubmit={updatePassword}>
            <label
              htmlFor="profile-new-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              New password
            </label>
            <PasswordInput
              id="profile-new-password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              invalid={Boolean(passwordError)}
              describedBy={passwordError ? "profile-password-error" : undefined}
            />
            {passwordError && (
              <p
                id="profile-password-error"
                className="mt-1 text-xs text-red-600"
              >
                {passwordError}
              </p>
            )}
            <button
              type="submit"
              disabled={loadingPassword}
              className="mt-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingPassword ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Gym info</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Name</dt>
            <dd className="text-gray-900">{gymName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Subdomain</dt>
            <dd className="text-gray-900">{gymSubdomain}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-red-200 bg-white p-5">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Danger zone</h2>
        <p className="mb-3 text-sm text-gray-500">Sign out from all devices.</p>
        <button
          onClick={() => setConfirmSignOut(true)}
          disabled={loadingSignOut}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingSignOut ? "Signing out..." : "Sign out everywhere"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out from all devices?"
        body="You will be logged out everywhere, including this device."
        confirmLabel="Sign out everywhere"
        destructive
        loading={loadingSignOut}
        onConfirm={() => {
          setConfirmSignOut(false);
          void signOutEverywhere();
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </div>
  );
}
