import Link from "next/link";
import { fasterOne } from "@/lib/fonts";
import { getGym } from "@/lib/gym/getGym";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gym = await getGym();

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center bg-[#080808] px-4 py-10 ${fasterOne.variable}`}
    >
      <Link
        href="/"
        className="mb-8 text-center text-3xl uppercase leading-none tracking-tight text-[#f0ede8] transition-colors hover:text-[#c8ff00]"
        style={{ fontFamily: "var(--font-faster-one, system-ui)" }}
      >
        {gym?.name ?? "Gym Platform"}
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
