"use client";

import React, { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Play,
  Pause,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Scissors,
  ArrowRight,
  Volume2,
  AlertTriangle,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { formatDurationHuman, formatRelativeDate, formatTimestamp } from "@/lib/utils";

export default function PublicSharePage() {
  const params = useParams();
  const token = String(params?.token || "");
  const { state, isHydrated, showToast } = useWorkspace();

  // Token can match either a full Meeting shareToken OR an individual HighlightClip shareToken.
  // Never fall back to an unrelated meeting if the token cannot be resolved.
  const resolved = useMemo(() => {
    for (const m of state.meetings) {
      if (m.shareToken === token || m.id === token) {
        return { mode: "meeting" as const, meeting: m, clip: null };
      }
      const foundClip = m.highlights.find((h) => h.shareToken === token || h.id === token);
      if (foundClip) {
        return { mode: "clip" as const, meeting: m, clip: foundClip };
      }
    }
    return {
      mode: "not_found" as const,
      meeting: null,
      clip: null,
    };
  }, [state.meetings, token]);

  const { mode, meeting, clip } = resolved;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(clip ? clip.startTime : 0);

  if (!meeting) {
    return (
      <div className="min-h-screen bg-[#090B10] text-gray-100 flex flex-col">
        <header className="border-b border-[#1E2330] bg-[#0D1017]">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-[#00D4B2]">
                <Sparkles className="h-4 w-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="font-bold tracking-tight text-white">FATHOM AI</span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <span>Enter Demo Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-[#262C3E] bg-[#111520] p-6 text-center space-y-4 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <h1 className="text-lg font-bold text-white">
              This shared meeting or clip is unavailable
            </h1>
            <p className="text-xs leading-relaxed text-gray-400">
              {!isHydrated
                ? `Checking local workspace storage for share token "${token}"...`
                : `The share token "${token}" could not be resolved. Custom clips created during a browser session are stored in that browser's localStorage (or ephemeral serverless cache) and are not available in a different browser after a cold start.`}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href="/share/share-acme-q4-discovery"
                className="w-full sm:w-auto rounded-xl border border-[#00D4B2]/40 bg-[#00D4B2]/10 px-4 py-2 text-xs font-semibold text-[#00D4B2] hover:bg-[#00D4B2]/20"
              >
                View Seeded Shared Meeting
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Go to Fathom Workspace
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeSummary =
    meeting.summariesByTemplate[meeting.activeTemplateId] ||
    meeting.summariesByTemplate.general;

  const handleTogglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      if (clip && (el.currentTime < clip.startTime || el.currentTime > clip.endTime)) {
        el.currentTime = clip.startTime;
      }
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (sec: number) => {
    setCurrentTime(sec);
    if (audioRef.current) {
      audioRef.current.currentTime = sec;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#090B10] text-gray-100">
      <audio
        ref={audioRef}
        src={meeting.mediaUrl}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrentTime(t);
          if (clip && t >= clip.endTime) {
            e.currentTarget.pause();
            setIsPlaying(false);
          }
        }}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Public Top Navigation Bar */}
      <header className="border-b border-[#1E2330] bg-[#0D1017]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-[#00D4B2]">
              <Sparkles className="h-4 w-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white">FATHOM</span>
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  PUBLIC SHARED {mode === "clip" ? "CLIP" : "RECORDING"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Accessible without login • Shared by {meeting.hostName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                showToast("Public share link copied!");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#262D40] bg-[#151A28] px-3 py-2 text-xs font-medium text-gray-200 hover:border-[#00D4B2]"
            >
              <Copy className="h-3.5 w-3.5 text-[#00D4B2]" />
              <span>Copy Public URL</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <span>Enter Full Fathom Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-5 md:p-8 space-y-6">
        {/* Shared Header Banner */}
        <div className="rounded-2xl border border-[#22283A] bg-[#111520] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#00D4B2]/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-[#00D4B2]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified Fathom Share Link
              </span>
              {clip && (
                <span className="rounded-md bg-amber-500/15 px-2.5 py-0.5 font-mono text-xs text-amber-300">
                  Highlight Clip ({formatTimestamp(clip.startTime)} – {formatTimestamp(clip.endTime)})
                </span>
              )}
              <span className="font-mono text-xs text-gray-400">
                {formatRelativeDate(meeting.scheduledAt)} • {formatDurationHuman(meeting.durationSeconds)}
              </span>
            </div>

            <Link
              href={`/meetings/${meeting.id}`}
              className="text-xs font-semibold text-indigo-400 hover:underline"
            >
              Open in Interactive Studio →
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-white">
            {clip ? `Clip: ${clip.title}` : meeting.title}
          </h1>
          <p className="text-sm text-gray-400">
            {clip ? `From meeting: ${meeting.title}` : meeting.subtitle}
          </p>

          {/* Audio Player Controls */}
          <div className="rounded-xl border border-[#1E2436] bg-[#0B0E16] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00D4B2] text-slate-950 shadow-lg hover:bg-[#00e6c2]"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                )}
              </button>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-[#00D4B2]" />
                  <span>
                    {clip
                      ? `Playing Highlight Clip (${formatTimestamp(clip.startTime)} - ${formatTimestamp(
                          clip.endTime
                        )})`
                      : "Play Full Recorded Audio"}
                  </span>
                </p>
                <p className="font-mono text-xs text-gray-400">
                  Current Timestamp: {formatTimestamp(currentTime)}
                </p>
              </div>
            </div>

            {clip && (
              <button
                onClick={() => handleSeek(clip.startTime)}
                className="rounded-lg border border-[#262D40] bg-[#151A28] px-3 py-1.5 font-mono text-xs text-[#00D4B2]"
              >
                Replay Clip from {formatTimestamp(clip.startTime)}
              </button>
            )}
          </div>
        </div>

        {/* Two Column Content: AI Summary + Synchronized Transcript */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-5">
            {clip && (
              <div className="rounded-2xl border border-[#00D4B2]/40 bg-[#00D4B2]/10 p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00D4B2]">
                  <Scissors className="h-4 w-4" />
                  <span>Featured Clip Verbatim Quote ({clip.tag})</span>
                </div>
                <p className="text-sm italic text-white leading-relaxed">
                  “{clip.transcriptExcerpt}”
                </p>
                <p className="text-xs text-gray-300">— {clip.speakerName}</p>
              </div>
            )}

            <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>AI Meeting Summary ({activeSummary.templateName})</span>
                </h2>
              </div>
              <p className="rounded-xl border border-[#1C2233] bg-[#0D1017] p-3.5 text-xs leading-relaxed text-gray-200">
                {activeSummary.tldr}
              </p>

              {activeSummary.sections.map((sec) => (
                <div key={sec.id} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    {sec.title}
                  </h3>
                  <ul className="space-y-2">
                    {sec.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-[#1B2030] bg-[#141824] p-3 text-xs text-gray-200"
                      >
                        <span>{item.text}</span>
                        {item.timestampSeconds !== undefined && (
                          <button
                            onClick={() => handleSeek(item.timestampSeconds!)}
                            className="shrink-0 rounded bg-[#00D4B2]/15 px-2 py-0.5 font-mono text-[11px] text-[#00D4B2]"
                          >
                            ▶ {formatTimestamp(item.timestampSeconds)}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2">
                  Extracted Action Items
                </h3>
                <div className="space-y-2">
                  {meeting.actionItems.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between rounded-lg border border-[#1B2030] bg-[#0D1017] p-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`h-4 w-4 ${
                            act.completed ? "text-emerald-400" : "text-gray-500"
                          }`}
                        />
                        <span className="text-white font-medium">{act.title}</span>
                      </div>
                      <span className="text-gray-400">{act.assigneeName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Transcript Column */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-5 space-y-3">
              <h2 className="text-base font-bold text-white">Interactive Transcript</h2>
              <p className="text-xs text-gray-400">
                Click any timestamp to jump the audio player
              </p>
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {meeting.transcript.map((seg) => {
                  const active = currentTime >= seg.startTime && currentTime <= seg.endTime;
                  return (
                    <button
                      key={seg.id}
                      onClick={() => handleSeek(seg.startTime)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-[#00D4B2] bg-[#152030]"
                          : "border-[#1C2130] bg-[#0D1017] hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-white">{seg.speakerName}</span>
                        <span className="flex items-center gap-1 font-mono text-[11px] text-[#00D4B2]">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(seg.startTime)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{seg.text}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
