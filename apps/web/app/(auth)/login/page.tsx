import LoginForm from "./LoginForm";
import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const gym = await getGym();

    // If we're already on a gym subdomain, go straight to the dashboard.
    if (gym) redirect("/dashboard");

    // Main domain: resolve the user's gym and bounce to their subdomain.
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
  }

  return <LoginForm />;
}
