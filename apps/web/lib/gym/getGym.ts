import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getSubdomainFromHost } from "@/lib/tenancy/subdomain";

export async function getGym() {
  const headersList = await headers();
  const headerSubdomain = headersList.get("x-gym-subdomain");
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  const subdomain = headerSubdomain ?? getSubdomainFromHost(host);

  console.log("x-gym-subdomain header:", subdomain);

  if (!subdomain) return null;

  const supabase = await createClient();

  const { data: gym, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("subdomain", subdomain)
    .single();

  console.log("gym:", gym);
  console.log("gym error:", error);

  return gym;
}
