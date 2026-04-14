"use client";

import { useState, useEffect } from "react";
import { CalendarEvent } from "@/lib/parseCalendar";

interface Brief {
  priorities: string[];
  flags: string[];
}

interface Standup {
  yesterday: string;
  today: string;
  blockers: string;
}

interface EndScreenProps {
  brief: Brief;
  standup: Standup;
  calendarEvents: CalendarEvent[];
  onRestart: () => void;
}

type EventStatus = "priority" | "flagged" | "neutral";

function classifyEvent(event: CalendarEvent, brief: Brief): EventStatus {
  const label = event.label.toLowerCase();
  const time = event.time.toLowerCase();
  const combined = `${time} ${label}`;

  for (const flag of brief.flags) {
    const f = flag.toLowerCase();
    if (f.includes(time) || label.split(" ").some((w) => w.length > 3 && f.includes(w))) {
      return "flagged";
    }
  }

  for (const priority of brief.priorities) {
    const p = priority.toLowerCase();
    if (
      label.split(" ").some((w) => w.length > 4 && p.includes(w)) ||
      p.split(" ").some((w) => w.length > 4 && combined.includes(w))
    ) {
      return "priority";
    }
  }

  return "neutral";
}

export default function EndScreen({ brief, standup, calendarEvents, onRestart }: EndScreenProps) {
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<"enter" | "scan" | "reveal">("enter");
  const [scannedCount, setScannedCount] = useState(0);
  const [showBrief, setShowBrief] = useState(false);
  const [showStandup, setShowStandup] = useState(false);

  useEffect(() => {
    // Phase 1: page enters
    const t1 = setTimeout(() => setPhase("scan"), 400);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== "scan") return;
    // Scan items one by one
    if (scannedCount < calendarEvents.length) {
      const t = setTimeout(() => setScannedCount((n) => n + 1), 130);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setPhase("reveal");
        setShowBrief(true);
        setTimeout(() => setShowStandup(true), 250);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [phase, scannedCount, calendarEvents.length]);

  const standupText = `Yesterday: ${standup.yesterday}\nToday: ${standup.today}\nBlockers: ${standup.blockers}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(standupText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="min-h-screen bg-[#080808] flex flex-col px-8 py-8"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.04) 0%, transparent 60%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <span className="text-white/30 text-xs font-medium tracking-widest uppercase">Huddle</span>
        <span className="text-white/15 text-xs">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </div>

      {/* Three columns */}
      <div
        className="flex-1 flex flex-col justify-center"
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(12px)" : "translateY(0)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <div className="grid grid-cols-3 gap-5 max-w-5xl mx-auto w-full">

          {/* Schedule — diff scanner */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-white/30 text-xs tracking-widest uppercase">Schedule</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-emerald-500/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />priority
                </span>
                <span className="flex items-center gap-1.5 text-xs text-amber-400/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />flagged
                </span>
              </div>
            </div>

            <div className="space-y-1">
              {calendarEvents.map((event, i) => {
                const status = classifyEvent(event, brief);
                const visible = i < scannedCount;

                return (
                  <div
                    key={i}
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? "translateX(0)" : "translateX(-6px)",
                      transition: "opacity 0.2s ease, transform 0.2s ease",
                      boxShadow:
                        visible && status === "priority"
                          ? "0 0 12px rgba(16,185,129,0.12)"
                          : visible && status === "flagged"
                          ? "0 0 12px rgba(251,191,36,0.08)"
                          : "none",
                    }}
                    className={`relative flex items-start gap-2 py-1.5 px-2.5 rounded-lg ${
                      status === "priority"
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : status === "flagged"
                        ? "bg-amber-400/8 border border-amber-400/20"
                        : "border border-transparent"
                    }`}
                  >
                    {/* Scan indicator dot */}
                    {visible && i === scannedCount - 1 && phase === "scan" && (
                      <span
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/40"
                        style={{ animation: "ping 0.6s ease-out" }}
                      />
                    )}

                    <span
                      className={`font-mono text-xs shrink-0 mt-0.5 w-3 ${
                        status === "priority"
                          ? "text-emerald-400"
                          : status === "flagged"
                          ? "text-amber-400"
                          : "text-white/15"
                      }`}
                    >
                      {status === "priority" ? "+" : status === "flagged" ? "!" : " "}
                    </span>
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-white/25">{event.time} </span>
                      <span
                        className={`font-mono text-xs ${
                          status === "priority"
                            ? "text-emerald-300"
                            : status === "flagged"
                            ? "text-amber-300"
                            : "text-white/45"
                        }`}
                      >
                        {event.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Brief */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              opacity: showBrief ? 1 : 0,
              transform: showBrief ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
            }}
          >
            <span className="text-white/30 text-xs tracking-widest uppercase">Daily Brief</span>

            <div className="space-y-2">
              <p className="text-white/20 text-xs">Top priorities</p>
              <ol className="space-y-3">
                {brief.priorities.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="text-xs mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center font-medium"
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        color: "rgba(52,211,153,0.8)",
                        fontSize: "10px",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-white/80 leading-snug">{p}</span>
                  </li>
                ))}
              </ol>
            </div>

            {brief.flags.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-white/20 text-xs">Flags</p>
                <div className="space-y-2">
                  {brief.flags.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-amber-300/70 rounded-lg px-2.5 py-2"
                      style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)" }}
                    >
                      <span className="shrink-0 mt-0.5">⚠</span>
                      <span className="leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Standup */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              opacity: showStandup ? 1 : 0,
              transform: showStandup ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
            }}
          >
            <span className="text-white/30 text-xs tracking-widest uppercase">Standup</span>

            <div className="space-y-4 flex-1">
              {[
                { label: "Yesterday", value: standup.yesterday },
                { label: "Today", value: standup.today },
                { label: "Blockers", value: standup.blockers },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-white/20 text-xs">{label}</p>
                  <p
                    className={`text-sm leading-relaxed ${
                      label === "Blockers" && value.toLowerCase() === "none"
                        ? "text-white/30"
                        : "text-white/75"
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: copied
                  ? "rgba(16,185,129,0.15)"
                  : "rgba(255,255,255,0.06)",
                border: copied
                  ? "1px solid rgba(16,185,129,0.3)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: copied ? "rgba(52,211,153,0.9)" : "rgba(255,255,255,0.5)",
              }}
            >
              {copied ? "Copied to clipboard" : "Copy standup"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="text-center mt-10 space-y-3"
          style={{
            opacity: showStandup ? 1 : 0,
            transition: "opacity 0.6s ease 0.3s",
          }}
        >
          <p className="text-white/25 text-sm tracking-wide">Good luck today.</p>
          <button
            onClick={onRestart}
            className="text-white/15 text-xs hover:text-white/35 transition-colors"
          >
            Start another briefing
          </button>
        </div>
      </div>
    </div>
  );
}
