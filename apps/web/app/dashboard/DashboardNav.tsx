import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import LogoutButton from "./LogoutButton";

export default async function DashboardNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const gym = await getGym();

  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/log", label: "Log" },
    { href: "/dashboard/history", label: "History" },
    { href: "/dashboard/saved-exercises", label: "Saved" },
    { href: "/dashboard/analytics", label: "Analytics" },
    { href: "/dashboard/leaderboard", label: "Leaderboard" },
    { href: "/dashboard/ai-report", label: "AI Report" },
    { href: "/dashboard/profile", label: "Profile" },
  ];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto hidden max-w-6xl items-center justify-between px-4 py-3 sm:flex">
        <div className="text-sm font-semibold text-gray-900">
          {gym?.name ?? "Gym Platform"}
        </div>
        <nav className="hidden items-center gap-2 sm:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-gray-500 sm:inline">
            {user?.email}
          </span>
          <LogoutButton />
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:hidden">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">
            {gym?.name ?? "Gym Platform"}
          </div>
          <div className="truncate text-[11px] text-gray-500">
            {user?.email}
          </div>
        </div>
        <LogoutButton />
      </div>

      <nav className="border-t border-gray-200 bg-white px-2 py-2 sm:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5 gap-2">
          {[
            { href: "/dashboard", label: "Home" },
            { href: "/dashboard/log", label: "Log" },
            { href: "/dashboard/analytics", label: "Analytics" },
            { href: "/dashboard/ai-report", label: "AI" },
            { href: "/dashboard/profile", label: "Profile" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-center rounded-lg border border-gray-200 px-2 py-2 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
