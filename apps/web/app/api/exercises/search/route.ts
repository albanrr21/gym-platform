import { NextRequest, NextResponse } from "next/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!rapidApiKey) {
    return NextResponse.json(
      { error: "RAPIDAPI_KEY is not set" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(name.toLowerCase())}?limit=10`,
    {
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch exercises", status: res.status },
      { status: 500 },
    );
  }

  const data: unknown = await res.json();

  const exercises = Array.isArray(data)
    ? data.map((raw) => {
        const ex = isRecord(raw) ? raw : {};
        return {
          id: typeof ex.id === "string" ? ex.id : "",
          name: typeof ex.name === "string" ? ex.name : "",
          bodyPart: typeof ex.bodyPart === "string" ? ex.bodyPart : "",
          equipment: typeof ex.equipment === "string" ? ex.equipment : "",
          secondaryMuscles: Array.isArray(ex.secondaryMuscles)
            ? (ex.secondaryMuscles.filter(
                (m) => typeof m === "string",
              ) as string[])
            : [],
          instructions: Array.isArray(ex.instructions)
            ? (ex.instructions.filter((i) => typeof i === "string") as string[])
            : [],
        };
      })
    : [];

  return NextResponse.json({ exercises });
}
