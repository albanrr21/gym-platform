import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-7xl">
            Welcome to Gym Platform
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            A platform to manage your gym and track your workouts.
          </p>
        </div>
        <div className="relative mt-10 w-full rounded-xl border bg-gray-100 p-6 shadow-lg dark:bg-gray-800">
          <Image
            src="https://linkspaces.co.uk/wp-content/uploads/2024/05/gb-botanica-gym-link-spaces-slough.jpg"
            alt="Gym Image"
            width={800}
            height={400}
            className="rounded-xl object-cover"
          />
        </div>
      </main>
    </div>
  );
}
