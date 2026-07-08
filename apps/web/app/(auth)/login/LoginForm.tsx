"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildGymBaseUrl } from "@/lib/tenancy/subdomain";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import PasswordInput from "@/components/ui/PasswordInput";

type FieldErrors = { email?: string; password?: string };

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const supabase = createClient();
  const { showToast } = useToast();

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Please enter a valid email address.";
    if (password.length < 6)
      next.password = "Password must be at least 6 characters.";
    return next;
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setLoading(true);

    let redirecting = false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showToast(error.message, "error");
        return;
      }

      const accessToken = data.session?.access_token;
      const refreshToken = data.session?.refresh_token;

      if (!accessToken || !refreshToken) {
        showToast("Login succeeded but session tokens are missing.", "error");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("gym_id")
        .eq("id", data.user.id)
        .single();

      const gymId = profile?.gym_id ?? data.user.user_metadata?.gym_id ?? null;

      if (profileError && !gymId) {
        showToast(profileError.message, "error");
        return;
      }

      if (!gymId) {
        const msg =
          "This account is not assigned to a gym. Ask an admin to set your gym_id.";
        showToast(msg, "error");
        return;
      }

      const { data: gym, error: gymError } = await supabase
        .from("gyms")
        .select("subdomain")
        .eq("id", gymId)
        .single();

      if (gymError) {
        showToast(gymError.message, "error");
        return;
      }

      const subdomain = gym?.subdomain ?? null;

      if (!subdomain) {
        showToast("Gym subdomain not found for this account.", "error");
        return;
      }

      let baseUrl: string;
      try {
        baseUrl = buildGymBaseUrl({
          currentHost: window.location.host,
          subdomain,
          configuredRootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
        });
      } catch {
        showToast(
          "Unable to resolve your gym URL. Please contact support.",
          "error",
        );
        return;
      }

      // If already on the correct subdomain, skip the cross-domain hop
      if (window.location.origin === baseUrl) {
        redirecting = true;
        window.location.href = "/dashboard";
        return;
      }

      redirecting = true;
      setRedirectUrl(`${baseUrl}/auth/callback`);

      const form = document.createElement("form");
      form.method = "POST";
      form.action = `${baseUrl}/auth/callback`;

      [
        ["access_token", accessToken],
        ["refresh_token", refreshToken],
      ].forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      if (!redirecting) setLoading(false);
    }
  }

  if (redirectUrl) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Redirecting…</h1>
        <p className="text-gray-500 mb-6">
          Taking you to your gym dashboard. If nothing happens, click below.
        </p>
        <a
          href={redirectUrl}
          className="inline-block w-full py-2 px-4 bg-[#c8ff00] text-black rounded-lg font-semibold hover:bg-[#d4ff33] transition-colors"
        >
          Go to Dashboard →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
      <p className="text-gray-500 mb-6">Sign in to your account</p>

      <form onSubmit={handleLogin} noValidate className="space-y-4 text-gray-900">
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${errors.email ? "border-red-400" : "border-gray-300"}`}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p id="login-email-error" className="mt-1 text-xs text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={Boolean(errors.password)}
            describedBy={errors.password ? "login-password-error" : undefined}
          />
          {errors.password && (
            <p id="login-password-error" className="mt-1 text-xs text-red-600">
              {errors.password}
            </p>
          )}
          <div className="mt-1 text-right">
            <Link
              href="/forgot-password"
              className="text-xs text-gray-600 hover:text-gray-900 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-[#c8ff00] text-black rounded-lg font-semibold hover:bg-[#d4ff33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-black font-medium hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
