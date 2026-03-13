import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const gym = await getGym();

  if (gym) {
    redirect("/register");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Gym Platform</h1>
        <p className="text-gray-500 mt-4">
          The white-label performance tracking platform for gyms.
        </p>
      </div>
    </div>
  );
}
