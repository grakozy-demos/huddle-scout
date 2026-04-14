import { NextRequest, NextResponse } from "next/server";
import { deriveFromContext } from "@/lib/deriveFromContext";

interface Utterance {
  role: string;
  content: string;
}

interface Brief {
  priorities: string[];
  flags: string[];
}

interface Standup {
  yesterday: string;
  today: string;
  blockers: string;
}

async function ollamaGenerate(prompt: string): Promise<string> {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2:latest",
      prompt,
      stream: false,
      options: { temperature: 0.4, num_predict: 800 },
    }),
  });
  if (!res.ok) throw new Error("Ollama unavailable");
  const data = await res.json();
  return data.response?.trim() ?? "";
}

function parseJSON(raw: string): { brief: Brief; standup: Standup } | null {
  // Extract the outermost JSON object from the response, regardless of surrounding text
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { transcript, context } = await req.json();

  const hasTranscript = transcript && (transcript as Utterance[]).length > 0;
  const sourceText = hasTranscript
    ? (transcript as Utterance[]).map((t) => `${t.role === "assistant" ? "Scout" : "User"}: ${t.content}`).join("\n")
    : context ?? "";
  const prompt = hasTranscript
    ? buildTranscriptPrompt(sourceText, context)
    : buildContextPrompt(sourceText);

  if (sourceText) {
    // When parsing a real transcript, use Anthropic first — small local models
    // hallucinate on extraction tasks. Fall back to Ollama if Anthropic is unavailable.
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (anthropicKey && hasTranscript) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const client = new Anthropic({ apiKey: anthropicKey });
        const message = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });
        const raw = message.content[0].type === "text" ? message.content[0].text : "";
        const parsed = parseJSON(raw);
        if (parsed?.brief && parsed?.standup) {
          return NextResponse.json(parsed);
        }
      } catch {
        // fall through to Ollama
      }
    }

    try {
      const raw = await ollamaGenerate(prompt);
      const parsed = parseJSON(raw);
      if (parsed?.brief && parsed?.standup) {
        return NextResponse.json(parsed);
      }
    } catch {
      // fall through
    }

    // Anthropic fallback for context-only path
    if (anthropicKey && !hasTranscript) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const client = new Anthropic({ apiKey: anthropicKey });
        const message = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });
        const raw = message.content[0].type === "text" ? message.content[0].text : "";
        const parsed = parseJSON(raw);
        if (parsed?.brief && parsed?.standup) {
          return NextResponse.json(parsed);
        }
      } catch {
        // fall through
      }
    }
  }

  // Last resort: derive from context without AI
  if (context) {
    return NextResponse.json(deriveFromContext(context));
  }

  return NextResponse.json(deriveFromContext(""));
}

function buildTranscriptPrompt(transcript: string, context: string) {
  return `Parse this morning briefing transcript and extract the key information. Output valid JSON only — no markdown fences, no explanation, nothing before or after the JSON object.

The JSON must have this exact shape:
{
  "brief": {
    "priorities": [<3 specific action items or focus areas — from the transcript if mentioned, otherwise from the calendar below>],
    "flags": [<any scheduling conflicts, blockers, or risks raised — empty array if none>]
  },
  "standup": {
    "yesterday": <one sentence: what the user said they finished — if not mentioned, infer from the calendar context>,
    "today": <one sentence: what the user said they're focused on — if not mentioned, derive from today's high-priority calendar items>,
    "blockers": <what the user named as blockers, or "None" if none mentioned>
  }
}

Use the actual words from the transcript first. For any field where the conversation didn't reach that topic, derive a specific answer from the calendar context — never use generic placeholder phrases.

Transcript:
${transcript}

Calendar context:
${context}`;
}

function buildContextPrompt(context: string) {
  return `Generate a morning briefing summary from this work calendar. Output valid JSON only — no markdown fences, no explanation, nothing before or after the JSON object.

The JSON must have this exact shape:
{
  "brief": {
    "priorities": [<3 specific tasks or meetings from the calendar that deserve focus today>],
    "flags": [<any back-to-back meetings, tight transitions, or scheduling risks — empty array if none>]
  },
  "standup": {
    "yesterday": <one plausible sentence about prep work done before today's meetings>,
    "today": <one sentence naming the high-priority task and top meeting from the calendar>,
    "blockers": "None"
  }
}

Use specifics from the calendar — real meeting names, real times, real task names. Do not use placeholder text.

Calendar:
${context}`;
}

