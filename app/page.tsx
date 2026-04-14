"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import LandingScreen from "@/components/LandingScreen";
import HairCheckScreen from "@/components/HairCheckScreen";
import ActiveSession, { Utterance } from "@/components/ActiveSession";
import EndScreen from "@/components/EndScreen";
import { parseCalendarEvents, CalendarEvent } from "@/lib/parseCalendar";
import { deriveFromContext } from "@/lib/deriveFromContext";

type Screen = "landing" | "haircheck" | "active" | "parsing" | "end";

interface SessionData {
  conversationId: string;
  conversationUrl: string;
  calendarEvents: CalendarEvent[];
  context: string;
}

interface ParsedResult {
  brief: {
    priorities: string[];
    flags: string[];
  };
  standup: {
    yesterday: string;
    today: string;
    blockers: string;
  };
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [scoutReady, setScoutReady] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [result, setResult] = useState<ParsedResult | null>(null);

  // Poll conversation status while on hair check screen
  useEffect(() => {
    if (screen !== "haircheck" || !session || scoutReady) return;

    const fallback = setTimeout(() => setScoutReady(true), 12000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/conversation-status?id=${session.conversationId}`);
        const { status } = await res.json();
        if (status === "active") {
          setScoutReady(true);
        }
      } catch {
        // ignore, fallback handles it
      }
    }, 1500);

    return () => {
      clearTimeout(fallback);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [screen, session, scoutReady]);

  useEffect(() => {
    if (scoutReady && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [scoutReady]);

  const handleStart = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch("/api/conversation", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession({
        conversationId: data.conversation_id,
        conversationUrl: data.conversation_url,
        calendarEvents: parseCalendarEvents(data.context ?? ""),
        context: data.context ?? "",
      });
      setScoutReady(false);
      setScreen("haircheck");
    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Couldn't start your briefing. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    setScreen("active");
  };

  const handleLeave = useCallback(async (conversationId: string, transcript: Utterance[]) => {
    setScreen("parsing");

    const context = session?.context ?? "";

    const [, parseRes] = await Promise.allSettled([
      fetch("/api/end-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      }),
      fetch("/api/parse-standup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, transcript, context }),
      }),
    ]);

    if (parseRes.status === "fulfilled" && parseRes.value.ok) {
      const data = await parseRes.value.json();
      setResult(data);
      setScreen("end");
    } else {
      // Parse failed — show end screen with calendar-derived fallback so the
      // user isn't silently dropped back to landing with no explanation
      setResult(deriveFromContext(session?.context ?? ""));
      setScreen("end");
    }
  }, [session]);

  const handleRestart = () => {
    setSession(null);
    setResult(null);
    setScreen("landing");
  };

  if (screen === "landing") {
    return <LandingScreen onStart={handleStart} loading={loading} error={error} />;
  }

  if (screen === "haircheck" && session) {
    return <HairCheckScreen onJoin={handleJoin} scoutReady={scoutReady} />;
  }

  if (screen === "active" && session) {
    return (
      <ActiveSession
        conversationUrl={session.conversationUrl}
        conversationId={session.conversationId}
        calendarEvents={session.calendarEvents}
        onLeave={handleLeave}
      />
    );
  }

  if (screen === "parsing") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse mx-auto" />
          <p className="text-white/30 text-sm">Building your brief...</p>
        </div>
      </div>
    );
  }

  if (screen === "end" && result) {
    return (
      <EndScreen
        brief={result.brief}
        standup={result.standup}
        calendarEvents={session?.calendarEvents ?? []}
        onRestart={handleRestart}
      />
    );
  }

  return null;
}
