import { getGym } from "@/lib/gym/getGym";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const gym = await getGym();

  if (!gym) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Register via your gym subdomain
        </h1>
        <p className="text-gray-600 mb-4">
          This page is only available on a gym subdomain, not the main domain.
        </p>
        <p className="text-gray-600 mb-4">
          Example:{" "}
          <a
            className="text-black font-medium hover:underline"
            href="http://elite.alban-rrahmani.me/register"
          >
            elite.alban-rrahmani.me/register
          </a>
        </p>
      </div>
    );
  }

  return <RegisterForm gymId={gym.id} gymName={gym.name} />;
}
