import { NextResponse } from "next/server";
import { getMockedContext, toSpokenContext } from "@/lib/context";

async function endAllActiveConversations() {
  const res = await fetch("https://tavusapi.com/v2/conversations?status=active", {
    headers: { "x-api-key": process.env.TAVUS_API_KEY! },
  });
  if (!res.ok) return;
  const { data } = await res.json();
  await Promise.all(
    (data ?? []).map((c: { conversation_id: string }) =>
      fetch(`https://tavusapi.com/v2/conversations/${c.conversation_id}`, {
        method: "DELETE",
        headers: { "x-api-key": process.env.TAVUS_API_KEY! },
      })
    )
  );
}

async function createConversation(context: string, greeting: string) {
  return fetch("https://tavusapi.com/v2/conversations", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TAVUS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      persona_id: process.env.TAVUS_PERSONA_ID,
      replica_id: process.env.TAVUS_REPLICA_ID,
      conversation_name: `Morning Briefing — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      conversational_context: toSpokenContext(context),
      custom_greeting: greeting,
      properties: {
        max_call_duration: 600,
        enable_recording: false,
      },
    }),
  });
}

export async function POST() {
  const { context, greeting } = await getMockedContext();

  let res = await createConversation(context, greeting);

  if (!res.ok) {
    const body = await res.text();
    const isConcurrentLimit = body.includes("maximum concurrent conversations");

    if (isConcurrentLimit) {
      await endAllActiveConversations();
      res = await createConversation(context, greeting);
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }
    } else {
      return NextResponse.json({ error: body }, { status: res.status });
    }
  }

  const data = await res.json();
  return NextResponse.json({
    conversation_id: data.conversation_id,
    conversation_url: data.conversation_url,
    context,
  });
}
