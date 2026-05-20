
import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import LogoutButton from "./LogoutButton";
import ActiveLink from "@/components/ui/ActiveLink";

const desktopItems = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/log", label: "Log", exact: true },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/saved-exercises", label: "Saved" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/ai-report", label: "AI Report" },
  { href: "/dashboard/profile", label: "Profile" },
];

const mobileItems = [
  { href: "/dashboard", label: "Home", exact: true },
  { href: "/dashboard/log", label: "Log", exact: true },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/analytics", label: "Stats" },
  { href: "/dashboard/ai-report", label: "AI" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default async function DashboardNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const gym = await getGym();

  return (
    <header className="border-b border-gray-200 bg-white">
      {/* Desktop */}
      <div className="mx-auto hidden max-w-6xl items-center justify-between px-4 py-3 sm:flex">
        <div className="text-sm font-semibold text-gray-900">
          {gym?.name ?? "Gym Platform"}
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {desktopItems.map((item) => (
            <ActiveLink
              key={item.href}
              href={item.href}
              label={item.label}
              exact={item.exact}
            />
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-gray-500 sm:inline">
            {user?.email}
          </span>
          <LogoutButton />
        </div>
      </div>

      {/* Mobile header */}
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

      {/* Mobile bottom nav */}
      <nav className="border-t border-gray-200 bg-white px-2 py-2 sm:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-6 gap-1.5">
          {mobileItems.map((item) => (
            <ActiveLink
              key={item.href}
              href={item.href}
              label={item.label}
              exact={item.exact}
              mobile
            />
          ))}
        </div>
      </nav>
    </header>
  );
}
