"use client";

interface LandingScreenProps {
  onStart: () => void;
  loading: boolean;
  error?: string;
}

export default function LandingScreen({ onStart, loading, error }: LandingScreenProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      <div className="absolute top-6 left-8">
        <span className="text-white/40 text-sm font-medium tracking-widest uppercase">
          Huddle
        </span>
      </div>

      <div className="text-center space-y-4">
        <p className="text-white/30 text-sm tracking-widest uppercase">{today}</p>
        <h1 className="text-white text-5xl font-light tracking-tight">
          Your morning briefing.
        </h1>
        <p className="text-white/40 text-base">Get in, make a plan, execute.</p>
      </div>

      <button
        onClick={onStart}
        disabled={loading}
        className="mt-12 px-8 py-3.5 bg-white text-black text-sm font-medium rounded-full hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Starting..." : "Start your briefing"}
      </button>

      {error && (
        <p className="mt-4 text-red-400/70 text-sm">{error}</p>
      )}
    </div>
  );
}
