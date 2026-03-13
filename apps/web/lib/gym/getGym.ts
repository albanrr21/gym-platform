import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function getGym() {
  const headersList = await headers();
  const subdomain = headersList.get("x-gym-subdomain");

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
