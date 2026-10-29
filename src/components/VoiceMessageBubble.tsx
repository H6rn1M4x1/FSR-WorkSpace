import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface VoiceMessageBubbleProps {
  url: string;
  isOwn: boolean;
  darkMode: boolean;
  durationSec?: number;
}

const BAR_COUNT = 24;

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Renders a WhatsApp-style voice note: a static waveform computed once by decoding the audio
 * (so it looks like a real waveform, not a generic spinner), with the played portion painted in
 * the accent color as `<audio>` reports progress via `timeupdate`.
 */
export function VoiceMessageBubble({ url, isOwn, darkMode, durationSec }: VoiceMessageBubbleProps) {
  const [levels, setLevels] = useState<number[] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationSec || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtor();
        const audioBuffer = await ctx.decodeAudioData(buf);
        const channelData = audioBuffer.getChannelData(0);
        const blockSize = Math.max(1, Math.floor(channelData.length / BAR_COUNT));
        const computed: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[start + j] || 0);
          }
          computed.push(sum / blockSize);
        }
        const max = Math.max(...computed, 0.0001);
        if (!cancelled) {
          setLevels(computed.map((v) => Math.max(0.15, v / max)));
          if (!durationSec) setDuration(audioBuffer.duration);
        }
        ctx.close();
      } catch (_) {
        if (!cancelled) setLevels(new Array(BAR_COUNT).fill(0.4));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, durationSec]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
  };

  const bars = levels || new Array(BAR_COUNT).fill(0.35);
  const playedBars = Math.round(progress * bars.length);
  const displayedTime = isPlaying || progress > 0 ? progress * duration : duration;

  return (
    <div className="flex items-center gap-2 min-w-[180px] max-w-[220px]">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (d && isFinite(d)) setDuration(d);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress(el.currentTime / el.duration);
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-90 ${
          isOwn
            ? darkMode
              ? "bg-white/20 text-white"
              : "bg-black/10 text-black"
            : "bg-primary text-white dark:text-blue-950"
        }`}
        title={isPlaying ? "Pausar" : "Reproducir"}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 flex items-end gap-[1.5px] h-6 overflow-hidden">
        {bars.map((lvl, i) => (
          <div
            key={i}
            className={`w-[2.5px] rounded-full transition-colors duration-150 ${
              i < playedBars
                ? isOwn
                  ? darkMode
                    ? "bg-white"
                    : "bg-black"
                  : "bg-primary"
                : isOwn
                ? darkMode
                  ? "bg-white/35"
                  : "bg-black/25"
                : darkMode
                ? "bg-zinc-600"
                : "bg-zinc-300"
            }`}
            style={{ height: `${Math.max(14, lvl * 100)}%` }}
          />
        ))}
      </div>
      <span
        className={`text-[9.5px] shrink-0 tabular-nums ${
          isOwn ? (darkMode ? "text-white/80" : "text-black/70") : "text-zinc-500"
        }`}
      >
        {formatTime(displayedTime)}
      </span>
    </div>
  );
}
