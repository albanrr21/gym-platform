"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  href: string;
  label: string;
  exact?: boolean;
  mobile?: boolean;
}

export default function ActiveLink({
  href,
  label,
  exact = false,
  mobile = false,
}: Props) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  if (mobile) {
    return (
      <Link
        href={href}
        className={`flex items-center justify-center rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
          isActive
            ? "border-black bg-black text-white"
            : "border-gray-200 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        isActive
          ? "border-black bg-black text-white"
          : "border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
