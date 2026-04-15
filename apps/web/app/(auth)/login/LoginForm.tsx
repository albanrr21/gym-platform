"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildGymBaseUrl } from "@/lib/tenancy/subdomain";
import Link from "next/link";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const supabase = createClient();

  function validate(): string | null {
    if (!email.trim()) return "Email is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  }

  async function handleLogin() {
    if (loading) return;
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);

    let redirecting = false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      const accessToken = data.session?.access_token;
      const refreshToken = data.session?.refresh_token;

      if (!accessToken || !refreshToken) {
        setError("Login succeeded but session tokens are missing.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("gym_id")
        .eq("id", data.user.id)
        .single();

      const gymId = profile?.gym_id ?? data.user.user_metadata?.gym_id ?? null;

      if (profileError && !gymId) {
        setError(profileError.message);
        return;
      }

      if (!gymId) {
        setError(
          "This account is not assigned to a gym. Ask an admin to set your gym_id.",
        );
        return;
      }

      const { data: gym, error: gymError } = await supabase
        .from("gyms")
        .select("subdomain")
        .eq("id", gymId)
        .single();

      if (gymError) {
        setError(gymError.message);
        return;
      }

      const subdomain = gym?.subdomain ?? null;

      if (!subdomain) {
        setError("Gym subdomain not found for this account.");
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
        setError("Unable to resolve your gym URL. Please contact support.");
        return;
      }

      // If already on the correct subdomain, skip the cross-domain hop
      if (window.location.origin === baseUrl) {
        redirecting = true;
        window.location.href = "/dashboard";
        return;
      }

      const url = `${baseUrl}/auth/callback?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;

      redirecting = true;
      setRedirectUrl(url);
      window.location.href = url;
    } catch {
      setError("Something went wrong. Please try again.");
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
          className="inline-block w-full py-2 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
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

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
        >
          {error}
        </div>
      )}

      <div className="space-y-4 text-gray-900">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>

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
