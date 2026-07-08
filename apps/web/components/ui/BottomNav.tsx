"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

type Tab = {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
};

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const tabs: Tab[] = [
  {
    href: "/dashboard",
    label: "Home",
    exact: true,
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/dashboard/log",
    label: "Log",
    exact: true,
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    href: "/dashboard/history",
    label: "History",
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: "/dashboard/analytics",
    label: "Stats",
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
  },
];

const moreItems = [
  { href: "/dashboard/templates", label: "Templates" },
  { href: "/dashboard/saved-exercises", label: "Saved Exercises" },
  { href: "/dashboard/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/ai-report", label: "AI Report" },
  { href: "/dashboard/profile", label: "Profile" },
];

function isActivePath(pathname: string, href: string, exact = false) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { signOut } = useAuth();

  const moreActive = moreItems.some((item) =>
    isActivePath(pathname, item.href),
  );

  useEffect(() => {
    if (!moreOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setMoreOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="More pages"
        >
          <div
            className="absolute inset-x-0 bottom-16 rounded-t-2xl border-t border-[var(--theme-border)] bg-white pb-2 pt-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200" />
            <nav className="flex flex-col">
              {moreItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`px-5 py-3 text-sm font-medium ${
                      active
                        ? "bg-[var(--theme-brand-soft)] text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={signOut}
                className="px-5 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--theme-border)] bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="grid grid-cols-5">
          {tabs.map((tab) => {
            const active = isActivePath(pathname, tab.href, tab.exact);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  active ? "text-[var(--theme-brand)]" : "text-gray-500"
                }`}
              >
                {tab.icon}
                {tab.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              moreActive || moreOpen
                ? "text-[var(--theme-brand)]"
                : "text-gray-500"
            }`}
          >
            <svg {...iconProps} aria-hidden="true">
              <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            More
          </button>
        </div>
      </nav>
    </>
  );
}
