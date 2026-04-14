"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import DailyIframe from "@daily-co/daily-js";
import { CalendarEvent } from "@/lib/parseCalendar";

export interface Utterance {
  role: "user" | "assistant";
  content: string;
}

interface ActiveSessionProps {
  conversationUrl: string;
  conversationId: string;
  calendarEvents: CalendarEvent[];
  onLeave: (conversationId: string, transcript: Utterance[]) => void;
}

export default function ActiveSession({
  conversationUrl,
  conversationId,
  calendarEvents,
  onLeave,
}: ActiveSessionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<Utterance[]>([]);
  const [weatherToast, setWeatherToast] = useState(false);

  const handleLeave = useCallback(() => {
    onLeave(conversationId, transcriptRef.current);
  }, [conversationId, onLeave]);

  useEffect(() => {
    if (!containerRef.current) return;

    try { DailyIframe.getCallInstance()?.destroy(); } catch {}
    if (containerRef.current.querySelector("iframe")) return;

    const call = DailyIframe.createFrame(containerRef.current, {
      url: conversationUrl,
      showLeaveButton: false,
      showFullscreenButton: false,
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "none",
        borderRadius: "16px",
      },
    });
    call.join();

    call.on("app-message", async (event) => {
      const msg = event?.data;
      if (!msg?.event_type) return;

      if (msg.event_type === "conversation.utterance") {
        const role = msg.properties?.role === "user" ? "user" : "assistant";
        const content = msg.properties?.speech ?? "";
        if (content) {
          transcriptRef.current = [...transcriptRef.current, { role, content }];
        }
      }

      // Handle weather tool call
      if (msg.event_type === "conversation.tool_call" && msg.properties?.name === "get_weather") {
        setWeatherToast(true);
        setTimeout(() => setWeatherToast(false), 4000);

        const echoText = await (async () => {
          try {
            const res = await fetch("/api/weather");
            const { result } = await res.json();
            return result;
          } catch {
            return "Weather is unavailable right now.";
          }
        })();

        call.sendAppMessage(
          {
            message_type: "conversation",
            event_type: "conversation.echo",
            conversation_id: msg.conversation_id,
            properties: { modality: "text", text: echoText },
          },
          "*"
        );
      }
    });

    call.on("left-meeting", handleLeave);

    return () => {
      call.destroy();
    };
  }, [conversationUrl, handleLeave]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-white/40 text-sm font-medium tracking-widest uppercase">
          Huddle
        </span>
        <button
          onClick={handleLeave}
          className="text-white/30 text-xs hover:text-white/60 transition-colors"
        >
          Leave
        </button>
      </div>

      <div className="flex flex-1 gap-4 px-6 pb-6">
        <div
          ref={containerRef}
          className="flex-1 bg-[#111] rounded-2xl overflow-hidden min-h-0"
          style={{ minHeight: "400px" }}
        />

        <div className="w-48 shrink-0 space-y-3">
          <p className="text-white/30 text-xs uppercase tracking-widest">Today</p>
          {calendarEvents.map((e) => (
            <div key={e.time} className="space-y-0.5">
              <p className="text-white/25 text-xs">{e.time}</p>
              <p className="text-white/60 text-sm leading-tight">{e.label}</p>
            </div>
          ))}
        </div>
      </div>

      {weatherToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 flex items-center gap-2">
          <span className="text-base">☔</span>
          <span className="text-white/70 text-sm">Weather retrieved</span>
        </div>
      )}
    </div>
  );
}
