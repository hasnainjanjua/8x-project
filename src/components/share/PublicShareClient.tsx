"use client";

import React, { useEffect, useRef, useState } from "react";
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
  User,
} from "lucide-react";
import {
  PublicClipShareView,
  PublicMeetingShareView,
  PublicShareResolution,
} from "@/lib/public-share-resolver";
import { formatDurationHuman, formatRelativeDate, formatTimestamp } from "@/lib/utils";

export function PublicShareClient({
  shareData,
}: {
  shareData: PublicShareResolution;
}) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showLocalToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  if (!shareData) {
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
              <span>Open Workspace</span>
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
              This share link could not be verified. It may be malformed, tampered with, expired, or removed by the workspace owner.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href="/share/share-acme-q4-discovery"
                className="w-full sm:w-auto rounded-xl border border-[#00D4B2]/40 bg-[#00D4B2]/10 px-4 py-2 text-xs font-semibold text-[#00D4B2] hover:bg-[#00D4B2]/20"
              >
                View Sample Shared Meeting
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

  return (
    <div className="min-h-screen bg-[#090B10] text-gray-100">
      {shareData.kind === "clip" ? (
        <ClipOnlyPublicView clip={shareData} onCopyToast={showLocalToast} />
      ) : (
        <MeetingFullPublicView meeting={shareData} onCopyToast={showLocalToast} />
      )}

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-indigo-500/40 bg-[#141824] px-4 py-3 text-sm font-medium text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-[#00D4B2]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function ClipOnlyPublicView({
  clip,
  onCopyToast,
}: {
  clip: PublicClipShareView;
  onCopyToast: (msg: string) => void;
}) {
  const S = clip.startTime;
  const E = clip.endTime;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(S);

  const clampToClip = (sec: number): number => {
    if (!Number.isFinite(sec)) return S;
    return Math.max(S, Math.min(E, sec));
  };

  // Ensure initial playback position is strictly S on mount and when clip changes.
  // Direct URL parameters cannot expand or escape [S, E].
  useEffect(() => {
    setCurrentTime(S);
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = S;
      } catch {
        // Ignore if metadata not yet loaded
      }
    }
  }, [S, E, clip.shareToken]);

  const handleTogglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      if (el.currentTime < S || el.currentTime >= E) {
        el.currentTime = S;
        setCurrentTime(S);
      }
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (requestedSeconds: number) => {
    const clamped = clampToClip(requestedSeconds);
    setCurrentTime(clamped);
    const el = audioRef.current;
    if (el) {
      el.currentTime = clamped;
      if (clamped < E) {
        el.play().catch(() => {});
        setIsPlaying(true);
      } else {
        el.pause();
        setIsPlaying(false);
      }
    }
  };

  const activeSegment =
    clip.transcript.find(
      (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
    ) ||
    [...clip.transcript].reverse().find((seg) => currentTime >= seg.startTime) ||
    clip.transcript[0];

  return (
    <>
      <audio
        ref={audioRef}
        src={clip.mediaUrl}
        preload="metadata"
        data-clip-start={S}
        data-clip-end={E}
        data-current-time={Math.round(currentTime)}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (el.currentTime < S || el.currentTime > E) {
            el.currentTime = S;
          }
          setCurrentTime(clampToClip(el.currentTime));
        }}
        onSeeking={(e) => {
          const el = e.currentTarget;
          if (el.currentTime < S) {
            el.currentTime = S;
            setCurrentTime(S);
          } else if (el.currentTime >= E) {
            el.currentTime = E;
            el.pause();
            setCurrentTime(E);
            setIsPlaying(false);
          }
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.currentTime < S) {
            el.currentTime = S;
            setCurrentTime(S);
            return;
          }
          if (el.currentTime >= E) {
            el.pause();
            el.currentTime = E;
            setCurrentTime(E);
            setIsPlaying(false);
            return;
          }
          setCurrentTime(clampToClip(el.currentTime));
        }}
        onEnded={() => {
          setCurrentTime(E);
          setIsPlaying(false);
        }}
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
                  PUBLIC SHARED CLIP
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Accessible without login • Time-Bounded Highlight Snippet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                onCopyToast("Public clip link copied!");
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
              <span>Open Fathom Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-5 md:p-8 space-y-6">
        {/* Scoped Clip Header Banner */}
        <div className="rounded-2xl border border-[#22283A] bg-[#111520] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#00D4B2]/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-[#00D4B2]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified Fathom Share Link
              </span>
              <span className="rounded-md bg-amber-500/15 px-2.5 py-0.5 font-mono text-xs text-amber-300">
                Highlight Clip ({formatTimestamp(S)} – {formatTimestamp(E)})
              </span>
              <span className="rounded-md bg-indigo-500/15 px-2.5 py-0.5 font-mono text-xs text-indigo-300">
                {clip.tag}
              </span>
              <span className="font-mono text-xs text-gray-400">
                Clip Duration: {formatDurationHuman(clip.durationSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-300">
              <User className="h-3.5 w-3.5 text-[#00D4B2]" />
              <span>Speaker: {clip.speakers.join(", ")}</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white">Clip: {clip.title}</h1>

          {/* Bounded Clip Audio Player Controls */}
          <div className="rounded-xl border border-[#1E2436] bg-[#0B0E16] p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePlay}
                  aria-label={isPlaying ? "Pause clip" : "Play clip"}
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
                      Playing Highlight Clip ({formatTimestamp(S)} - {formatTimestamp(E)})
                    </span>
                  </p>
                  <p className="font-mono text-xs text-gray-400">
                    Current Timestamp: {formatTimestamp(currentTime)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleSeek(S)}
                className="rounded-lg border border-[#262D40] bg-[#151A28] px-3 py-1.5 font-mono text-xs text-[#00D4B2] hover:border-[#00D4B2]"
              >
                Replay Clip from {formatTimestamp(S)}
              </button>
            </div>

            {/* Bounded Timeline Scrubber strictly constrained to [S, E] */}
            <div className="flex items-center gap-3 pt-1">
              <span className="font-mono text-[11px] text-[#00D4B2]">{formatTimestamp(S)}</span>
              <input
                type="range"
                aria-label="Clip playback timeline"
                min={S}
                max={E}
                step={0.1}
                value={clampToClip(currentTime)}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-[#1E2436] accent-[#00D4B2]"
              />
              <span className="font-mono text-[11px] text-[#00D4B2]">{formatTimestamp(E)}</span>
            </div>
          </div>
        </div>

        {/* Two Column Content: Featured Clip Excerpt + Scoped Clip Transcript */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-5">
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

            <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Scoped Highlight Clip Access ({formatTimestamp(S)} – {formatTimestamp(E)})</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-400">
                This share link authorizes playback and transcript review strictly for the selected{" "}
                {formatDurationHuman(clip.durationSeconds)} clip window ({formatTimestamp(S)} –{" "}
                {formatTimestamp(E)}) spoken by {clip.speakers.join(", ")}.
              </p>
            </div>
          </div>

          {/* Scoped Clip Transcript Column (ONLY segments overlapping [S, E]) */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Clip Transcript</h2>
                <span className="rounded bg-[#191F2E] px-2 py-0.5 font-mono text-[11px] text-[#00D4B2]">
                  {formatTimestamp(S)} – {formatTimestamp(E)}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Transcript utterances within the authorized clip interval
              </p>
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {clip.transcript.map((seg) => {
                  const active = activeSegment?.id === seg.id;
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
                          {formatTimestamp(seg.startTime)} – {formatTimestamp(seg.endTime)}
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
    </>
  );
}

function MeetingFullPublicView({
  meeting,
  onCopyToast,
}: {
  meeting: PublicMeetingShareView;
  onCopyToast: (msg: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const activeSegment =
    meeting.transcript.find(
      (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
    ) ||
    [...meeting.transcript].reverse().find((seg) => currentTime >= seg.startTime) ||
    meeting.transcript[0];

  const handleTogglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (sec: number) => {
    const clamped = Math.max(0, Math.min(meeting.durationSeconds, sec));
    setCurrentTime(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={meeting.mediaUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
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
                  PUBLIC SHARED RECORDING
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
                onCopyToast("Public share link copied!");
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
              <span>Open Fathom Workspace</span>
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
              <span className="font-mono text-xs text-gray-400">
                {formatRelativeDate(meeting.scheduledAt)} • {formatDurationHuman(meeting.durationSeconds)}
              </span>
            </div>

            <Link
              href={`/meetings/${meeting.meetingId}`}
              className="text-xs font-semibold text-indigo-400 hover:underline"
            >
              Open in Interactive Studio →
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
          <p className="text-sm text-gray-400">{meeting.subtitle}</p>

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
                  <span>Play Full Recorded Audio</span>
                </p>
                <p className="font-mono text-xs text-gray-400">
                  Current Timestamp: {formatTimestamp(currentTime)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Content: AI Summary + Synchronized Transcript */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>Meeting Summary ({meeting.summary.templateName})</span>
                </h2>
              </div>
              <p className="rounded-xl border border-[#1C2233] bg-[#0D1017] p-3.5 text-xs leading-relaxed text-gray-200">
                {meeting.summary.tldr}
              </p>

              {meeting.summary.sections.map((sec) => (
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
                  const active = activeSegment?.id === seg.id;
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
    </>
  );
}
