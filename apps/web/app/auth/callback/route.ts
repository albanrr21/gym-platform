import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function handleAuthCallback(
  request: NextRequest,
  accessToken: string | null,
  refreshToken: string | null,
) {
  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");

  return handleAuthCallback(request, accessToken, refreshToken);
}

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const accessToken = body.get("access_token");
  const refreshToken = body.get("refresh_token");

  return handleAuthCallback(
    request,
    typeof accessToken === "string" ? accessToken : null,
    typeof refreshToken === "string" ? refreshToken : null,
  );
}
