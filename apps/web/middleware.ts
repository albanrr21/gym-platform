import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const rootDomain = process.env.ROOT_DOMAIN || "alban-rrahmani.me";

  const subdomain = hostname
    .replace(`.${rootDomain}`, "")
    .replace(`.localhost:3000`, "");

  const isRootDomain =
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost:3000";

  if (!isRootDomain && subdomain) {
    const url = request.nextUrl.clone();
    const response = NextResponse.rewrite(url);
    response.headers.set("x-gym-subdomain", subdomain);
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next.static|_next/image|favicon.ico).*)"],
};
