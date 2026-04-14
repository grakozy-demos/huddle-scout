# Huddle

**Your AI morning briefing, face-to-face.**

Huddle is a 5-minute standup agent built on Tavus CVI. Every morning, Scout — your AI briefing partner — reviews your calendar, flags conflicts before you find them, walks you through the day, and hands you a formatted standup when you're done. No bots in a channel. No typing into a void. A real conversation.

---

## What it does

**Before the call**
Huddle generates a fresh work calendar for each session using a local LLM (Ollama). It scans that calendar for back-to-back meetings and writes a custom opening line that names the specific conflict — so Scout sounds like she's actually done her homework.

**During the call**
Scout opens with the conflict she found, then walks your day however you want — full calendar sweep, blockers first, or free-form. She can pull live weather if you ask. Every word is transcribed in real time so nothing gets lost.

**After the call**
Huddle processes the transcript and surfaces three things on a single screen:

- **Schedule** — your day scanned like a diff, with priority meetings highlighted green and flagged conflicts in amber
- **Daily Brief** — top 3 priorities and any risks Scout caught
- **Standup** — yesterday, today, blockers, ready to copy into Slack

---

## Stack

| Layer | Tech |
|---|---|
| Conversational video | Tavus CVI |
| Video transport | Daily.js |
| Calendar generation | Ollama (llama3.2) |
| Transcript parsing | Ollama → Anthropic fallback |
| Weather tool | OpenWeatherMap |
| Frontend | Next.js 15, TypeScript, Tailwind |

---

## Setup

### 1. Install dependencies

```bash
cd huddle
npm install
```

### 2. Configure environment

Create `.env.local`:

```bash
TAVUS_API_KEY=your_tavus_api_key
TAVUS_PERSONA_ID=your_persona_id
TAVUS_REPLICA_ID=your_replica_id
OPENWEATHER_API_KEY=your_owm_key      # optional, enables weather tool
ANTHROPIC_API_KEY=your_anthropic_key  # optional, fallback for transcript parsing
```

### 3. Patch the persona (one-time)

Adds the `get_weather` tool to Scout's persona config so she can invoke it reliably:

```bash
TAVUS_API_KEY=your_key node scripts/patch-persona.js
```

### 4. Start Ollama

Huddle uses Ollama for local calendar generation and transcript parsing. Make sure it's running with the llama3.2 model:

```bash
ollama serve
ollama pull llama3.2
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How a session works

1. **Start** — Huddle calls the Tavus API and generates a fresh calendar via Ollama. Scout's greeting is dynamically written to name the specific back-to-back conflict in that calendar.

2. **Camera check** — Your camera preview loads. Huddle polls the Tavus conversation status until Scout is live, then unlocks the Join button.

3. **Briefing** — You and Scout talk face-to-face. Your calendar is shown in the sidebar. Scout can pull live weather from Bozeman, MT if you ask.

4. **End screen** — The transcript is parsed into a 3-column summary. Calendar events are classified as priority, flagged, or neutral. Your standup is ready to copy.

---

## Architecture notes

- **Transcript capture**: Tavus doesn't expose transcripts via REST. Huddle captures `conversation.utterance` app-messages from Daily in real time and holds them in a ref until the call ends.
- **Tool calls**: Scout's weather tool fires a `conversation.tool_call` event. The client fetches `/api/weather` and responds via `conversation.echo` — all within the active Daily session.
- **Concurrent sessions**: If the Tavus account hits its concurrent limit, the conversation route auto-ends all active sessions and retries.
- **StrictMode disabled**: Daily.js throws on double-mount in React StrictMode. `reactStrictMode: false` in `next.config.ts` prevents the duplicate iframe error.

---

Built with [Tavus CVI](https://tavus.io) · Powered by [Daily](https://daily.co)
