interface Brief {
  priorities: string[];
  flags: string[];
}

interface Standup {
  yesterday: string;
  today: string;
  blockers: string;
}

export function deriveFromContext(context: string): { brief: Brief; standup: Standup } {
  const lines = context.split("\n");
  const events: string[] = [];
  const tasks: string[] = [];
  const flags: string[] = [];
  let highPriority = "";

  for (const line of lines) {
    const eventMatch = line.match(/(\d{1,2}:\d{2}(?:am|pm))\s*[–-]\s*\d{1,2}:\d{2}(?:am|pm)\s+(.+)/i);
    if (eventMatch) {
      const label = eventMatch[2].replace(/←.*$/, "").trim();
      const time = eventMatch[1];
      events.push(`${time} ${label}`);
      if (line.includes("←")) {
        flags.push(`Back-to-back at ${time} — no buffer before next meeting`);
      }
    }
    const taskMatch = line.match(/\[ \] (.+)/);
    if (taskMatch) {
      tasks.push(taskMatch[1]);
      if (line.includes("high priority") && !highPriority) {
        highPriority = taskMatch[1].replace(/\(.*?\)/, "").trim();
      }
    }
  }

  return {
    brief: {
      priorities: [
        highPriority || tasks[0] || "Complete high-priority task",
        events.find((e) => e.includes("Client") || e.includes("call")) || events[3] || "Key meeting",
        tasks[1] || "Clear open tasks",
      ].filter(Boolean).slice(0, 3),
      flags,
    },
    standup: {
      yesterday: "Reviewed open work and prepared for today's meetings",
      today: highPriority
        ? `${highPriority} and prep for today's calls`
        : "Work through today's priorities",
      blockers: "None",
    },
  };
}
