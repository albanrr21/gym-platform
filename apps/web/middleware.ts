import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const isDev = hostname.includes("localhost");

  const subdomain = isDev
    ? hostname.split(".localhost")[0] !== hostname
      ? hostname.split(".localhost")[0]
      : null
    : hostname.split(".")[0];
  
  const response = await updateSession(request);

  if (subdomain && subdomain !== "www") {
    response.headers.set("x-gym-subdomain", subdomain);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
