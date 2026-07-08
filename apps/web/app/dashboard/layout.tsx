import type { Metadata } from "next";
import { getGym } from "@/lib/gym/getGym";
import DashboardNav from "./DashboardNav";
import BottomNav from "@/components/ui/BottomNav";

export async function generateMetadata(): Promise<Metadata> {
  const gym = await getGym();
  const siteName = gym ? `${gym.name} - Gym Platform` : "Gym Platform";
  return {
    title: {
      default: siteName,
      template: `%s · ${gym?.name ?? "Gym Platform"}`,
    },
    description: gym
      ? `Performance tracking for ${gym.name}`
      : "AI-powered gym performance platform",
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="pb-20 sm:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
