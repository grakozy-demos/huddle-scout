import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ status: "unknown" });

  const res = await fetch(`https://tavusapi.com/v2/conversations/${id}`, {
    headers: { "x-api-key": process.env.TAVUS_API_KEY! },
  });

  if (!res.ok) return NextResponse.json({ status: "unknown" });
  const data = await res.json();
  return NextResponse.json({ status: data.status ?? "unknown" });
}
