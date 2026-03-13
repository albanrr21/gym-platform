import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const gym = await getGym();

  // If the user hits the main domain dashboard, bounce them to their gym subdomain.
  if (!gym) {
    const { data: profile } = await supabase
      .from("users")
      .select("gym_id")
      .eq("id", user.id)
      .single();

    if (profile?.gym_id) {
      const { data: gymRow } = await supabase
        .from("gyms")
        .select("subdomain")
        .eq("id", profile.gym_id)
        .single();

      const subdomain = gymRow?.subdomain ?? null;

      if (subdomain) {
        const headersList = await headers();
        const host = headersList.get("host") ?? "";
        const isLocal = host.includes("localhost");
        const port = host.includes(":") ? `:${host.split(":").pop()}` : "";
        const inferredRootDomain = isLocal
          ? `localhost${port}`
          : host.split(".").slice(-2).join(".");
        const rootDomain =
          process.env.ROOT_DOMAIN ??
          process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
          inferredRootDomain;
        const protocol = rootDomain.includes("localhost") ? "http" : "https";

        redirect(
          `${protocol}://${subdomain}.${rootDomain.replace(/^https?:\/\//, "")}/dashboard`,
        );
      }
    }

    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 p-4 bg-black text-white rounded-lg">
          <p className="text-sm opacity-70">You are logged into</p>
          <p className="text-xl font-bold">{gym.name}</p>
          <p className="text-sm opacity-70 mt-1">subdomain: {gym.subdomain}</p>
        </div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 mt-2">
          Welcome, {profile?.full_name ?? user.email}
        </p>
      </div>
    </div>
  );
}
