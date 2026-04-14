"use client";

import { useEffect, useRef, useState } from "react";

interface HairCheckScreenProps {
  onJoin: () => void;
  scoutReady: boolean;
}

export default function HairCheckScreen({ onJoin, scoutReady }: HairCheckScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camError, setCamError] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => setCamError(true));

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      <div className="absolute top-6 left-8">
        <span className="text-white/40 text-sm font-medium tracking-widest uppercase">
          Huddle
        </span>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-white text-xl font-light">Camera check</h2>
          <p className="text-white/40 text-sm">
            {scoutReady ? "Scout is ready." : "Scout is joining..."}
          </p>
        </div>

        <div className="relative aspect-video bg-[#1a1a1a] rounded-2xl overflow-hidden">
          {camError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/30 text-sm">Camera unavailable</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}
          {!scoutReady && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <div className="flex gap-1.5 items-center bg-black/60 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse" />
                <span className="text-white/50 text-xs">Scout joining</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onJoin}
          disabled={!scoutReady}
          className="w-full py-3.5 bg-white text-black text-sm font-medium rounded-full hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Join briefing
        </button>
      </div>
    </div>
  );
}
