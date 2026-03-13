import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getSubdomainFromHost } from "@/lib/tenancy/subdomain";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const subdomain = getSubdomainFromHost(host);

  // Ensure server components/routes can read the gym subdomain as a request header.
  const requestHeaders = new Headers(request.headers);
  if (subdomain) requestHeaders.set("x-gym-subdomain", subdomain);

  const response = await updateSession(request, requestHeaders);

  // Useful when debugging in the browser/network tab.
  if (subdomain) response.headers.set("x-gym-subdomain", subdomain);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
