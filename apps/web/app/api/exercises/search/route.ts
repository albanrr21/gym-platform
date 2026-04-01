import { NextRequest, NextResponse } from "next/server";

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

  const data = await res.json();

  const exercises = data.map((ex: any) => ({
    id: ex.id,
    name: ex.name,
    bodyPart: ex.bodyPart,
    equipment: ex.equipment,
    secondaryMuscles: ex.secondaryMuscles || [],
    instructions: ex.instructions || [],
  }));

  return NextResponse.json({ exercises });
}
