"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import PasswordInput from "@/components/ui/PasswordInput";

interface Props {
  gymId: string;
  gymName: string;
}

type FieldErrors = { fullName?: string; email?: string; password?: string };

export default function RegisterForm({ gymId, gymName }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!fullName.trim()) next.fullName = "Full name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Please enter a valid email address.";
    if (password.length < 6)
      next.password = "Password must be at least 6 characters.";
    return next;
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            gym_id: gymId,
          },
        },
      });

      if (error) {
        showToast(error.message, "error");
        return;
      }

      if (!data.session) {
        const msg =
          "Account created. Check your email to confirm, then sign in.";
        showToast(msg, "success");
        return;
      }

      showToast("Account created successfully.", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Create account</h1>
      <p className="text-gray-500 mb-6">Join {gymName}</p>

      <form
        onSubmit={handleRegister}
        noValidate
        className="space-y-4 text-gray-900"
      >
        <div>
          <label
            htmlFor="register-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Full name
          </label>
          <input
            id="register-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={errors.fullName ? "register-name-error" : undefined}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${errors.fullName ? "border-red-400" : "border-gray-300"}`}
            placeholder="John Doe"
          />
          {errors.fullName && (
            <p id="register-name-error" className="mt-1 text-xs text-red-600">
              {errors.fullName}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${errors.email ? "border-red-400" : "border-gray-300"}`}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p id="register-email-error" className="mt-1 text-xs text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <PasswordInput
            id="register-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="At least 6 characters"
            invalid={Boolean(errors.password)}
            describedBy={
              errors.password ? "register-password-error" : undefined
            }
          />
          {errors.password && (
            <p
              id="register-password-error"
              className="mt-1 text-xs text-red-600"
            >
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-[#c8ff00] text-black rounded-lg font-semibold hover:bg-[#d4ff33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-black font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
