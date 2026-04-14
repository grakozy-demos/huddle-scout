export interface CalendarEvent {
  time: string;
  label: string;
}

export function parseCalendarEvents(context: string): CalendarEvent[] {
  const lines = context.split("\n");
  const events: CalendarEvent[] = [];

  for (const line of lines) {
    // Match lines like "  9:00am – 9:30am   Team standup"
    const match = line.match(/(\d{1,2}:\d{2}(?:am|pm))\s*[–-]\s*\d{1,2}:\d{2}(?:am|pm)\s+(.+)/i);
    if (match) {
      const label = match[2]
        .replace(/←.*$/, "")   // strip the ← annotation
        .trim();
      events.push({ time: match[1], label });
    }
    // Stop at Open Tasks
    if (line.startsWith("Open Tasks")) break;
  }

  return events;
}
