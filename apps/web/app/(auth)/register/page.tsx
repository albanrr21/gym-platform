import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const gym = await getGym();

  if (!gym) redirect("/");

  return <RegisterForm gymId={gym.id} gymName={gym.name} />;
}
