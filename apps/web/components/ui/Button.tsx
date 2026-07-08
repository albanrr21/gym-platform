"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--theme-brand)] text-[var(--theme-brand-foreground)] hover:opacity-90 border border-transparent",
  secondary:
    "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700 border border-transparent",
  ghost: "text-gray-600 hover:bg-gray-100 border border-transparent",
};

export default function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
        />
      )}
      {children}
    </button>
  );
}
