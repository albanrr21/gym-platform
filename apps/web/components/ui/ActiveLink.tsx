"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  href: string;
  label: string;
  exact?: boolean;
}

export default function ActiveLink({ href, label, exact = false }: Props) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        isActive
          ? "border-[var(--theme-brand)] bg-[var(--theme-brand)] text-[var(--theme-brand-foreground)]"
          : "border-[var(--theme-border)] text-[var(--foreground)]/80 hover:bg-[var(--theme-brand-soft)]"
      }`}
    >
      {label}
    </Link>
  );
}
