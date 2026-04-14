const GREETINGS = [
  "Hey, morning!",
  "Hey, good to see you.",
  "Hey! Morning.",
  "Morning, good to see you.",
];

function buildGreeting(): string {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

const EXAMPLE = `Today's Calendar — Monday, March 10:
  9:00am – 9:30am   Engineering standup (5 attendees)
  10:30am – 11:30am  Product roadmap review — Helix Labs
  12:00pm – 1:00pm   Lunch (no location set)
  2:00pm – 3:00pm   Client check-in — Vantage Group
  3:00pm – 3:30pm   one-to-one with Jordan  ← back-to-back, no buffer
  5:00pm – 6:00pm   Deep work block (competitive analysis)

Open Tasks:
  [ ] Finalize pricing model (due today, high priority)
  [ ] Send follow-up to Vantage Group
  [ ] Review onboarding flow with design`;

const buildPrompt = (today: string) =>
  `Generate a realistic mocked work calendar for a demo. Today is ${today}.

Here is an example of the exact format required:

${EXAMPLE}

Now generate a NEW one for ${today}. Rules:
- Same structure, same line format, same spacing
- Keep "← back-to-back, no buffer" on the 3:00pm line exactly as shown
- Keep "Lunch (no location set)" exactly as shown
- Invent completely different company names, people, meeting names, and tasks
- Never use "1:1 with" — always write one-to-ones as "one-to-one with [Name]"
- Make the high-priority task something specific and believable
- Output only the calendar text — no intro, no explanation, nothing before "Today's Calendar"`;

export function toSpokenContext(context: string): string {
  const lines = context.split("\n");
  const events: { time: string; label: string; flagged: boolean }[] = [];
  const tasks: { text: string; priority: boolean }[] = [];
  let header = "";
  let inTasks = false;

  for (const line of lines) {
    if (line.startsWith("Today's Calendar")) {
      header = line.replace("Today's Calendar — ", "").replace(":", "").trim();
      continue;
    }
    if (line.startsWith("Open Tasks")) { inTasks = true; continue; }

    if (!inTasks) {
      const m = line.match(/(\d{1,2}:\d{2}(?:am|pm))\s*[–-]\s*\d{1,2}:\d{2}(?:am|pm)\s+(.+)/i);
      if (m) {
        const label = m[2].replace(/←.*$/, "").trim();
        events.push({ time: m[1], label, flagged: line.includes("←") });
      }
    } else {
      const m = line.match(/\[ \] (.+)/);
      if (m) tasks.push({ text: m[1], priority: line.includes("high priority") });
    }
  }

  const parts: string[] = [];
  if (header) parts.push(`Today is ${header}.`);

  if (events.length) {
    parts.push("Here is what is on the schedule today:");
    for (const e of events) {
      const flag = e.flagged ? " — note this runs back to back with no buffer before the next meeting" : "";
      parts.push(`At ${e.time}: ${e.label}${flag}.`);
    }
  }

  const priority = tasks.find(t => t.priority);
  const rest = tasks.filter(t => !t.priority);

  if (priority || rest.length) {
    parts.push("Open tasks for today:");
    if (priority) parts.push(`Top priority: ${priority.text.replace(/\(.*?\)/, "").trim()}.`);
    for (const t of rest) parts.push(`Also: ${t.text}.`);
  }

  return parts.join(" ");
}

export async function getMockedContext(): Promise<{ context: string; greeting: string }> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2:latest",
        prompt: buildPrompt(today),
        stream: false,
        options: { temperature: 0.85, num_predict: 350 },
      }),
    });

    if (!res.ok) throw new Error("Ollama unavailable");
    const data = await res.json();
    const raw = (data.response ?? "").trim();

    if (!raw.startsWith("Today's Calendar") || !raw.includes("Open Tasks")) {
      throw new Error("Bad format");
    }

    return { context: raw, greeting: buildGreeting() };
  } catch {
    const context = getFallbackContext(today);
    return { context, greeting: buildGreeting() };
  }
}

function getFallbackContext(today: string) {
  return `Today's Calendar — ${today}:
  9:00am – 9:30am   Engineering standup (4 attendees)
  10:30am – 11:30am  Product review — Meridian Partners
  12:00pm – 1:00pm   Lunch (no location set)
  2:00pm – 3:00pm   Client sync — Apex Solutions
  3:00pm – 3:30pm   one-to-one with Marcus  ← back-to-back, no buffer
  5:00pm – 6:00pm   Deep work block (Q2 planning)

Open Tasks:
  [ ] Finalize Q2 roadmap (due today, high priority)
  [ ] Send contract to Meridian
  [ ] Follow up with design team on brand refresh`;
}
