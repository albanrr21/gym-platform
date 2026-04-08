import LoginForm from "./LoginForm";
import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { buildGymBaseUrl } from "@/lib/tenancy/subdomain";
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
        const host =
          headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
        const baseUrl = buildGymBaseUrl({
          currentHost: host,
          subdomain,
          configuredRootDomain:
            process.env.ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN,
        });

        redirect(`${baseUrl}/dashboard`);
      }
    }
  }

  return <LoginForm />;
}
