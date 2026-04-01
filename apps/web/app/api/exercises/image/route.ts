import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const exerciseId = searchParams.get("exerciseId");
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  if (!exerciseId) {
    return NextResponse.json(
      { error: "Exercise ID is required" },
      { status: 400 },
    );
  }
  if (!rapidApiKey) {
    return NextResponse.json(
      { error: "RAPIDAPI_KEY is not set" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://exercisedb.p.rapidapi.com/image?resolution=180&exerciseId=${exerciseId}`,
    {
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch exercise image", status: res.status },
      { status: 500 },
    );
  }

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("Content-Type") || "image/gif";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
