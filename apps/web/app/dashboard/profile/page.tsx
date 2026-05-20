import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const gym = await getGym();
  if (!gym) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <ProfileForm
      initialFullName={profile?.full_name ?? ""}
      email={user.email ?? ""}
      gymName={gym.name}
      gymSubdomain={gym.subdomain}
    />
  );
}
