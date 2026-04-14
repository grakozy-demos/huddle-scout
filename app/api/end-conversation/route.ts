import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { conversationId } = await req.json();
  if (!conversationId) return NextResponse.json({ ok: true });

  await fetch(`https://tavusapi.com/v2/conversations/${conversationId}`, {
    method: "DELETE",
    headers: { "x-api-key": process.env.TAVUS_API_KEY! },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
