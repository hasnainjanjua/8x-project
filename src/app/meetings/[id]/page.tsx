"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Sparkles,
  CheckSquare,
  Scissors,
  Share2,
  Copy,
  Mail,
  MessageSquare,
  Search,
  Edit3,
  Check,
  X,
  Trash2,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  Plus,
  Send,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { SUMMARY_TEMPLATES_META } from "@/data/seed-meetings";
import { HighlightTag, SummaryTemplateId } from "@/types/fathom";
import { formatDurationHuman, formatRelativeDate, formatTimestamp } from "@/lib/utils";

function MeetingStudioInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = String(params?.id || "");
  const initialTimeParam = Number(searchParams?.get("t") || 0);

  const {
    state,
    switchMeetingTemplate,
    updateTranscriptSegmentText,
    createHighlightClip,
    deleteHighlightClip,
    toggleActionItem,
    addActionItem,
    updateActionItem,
    deleteActionItem,
    deleteSimulatedMeeting,
    showToast,
  } = useWorkspace();

  const meeting = useMemo(
    () => state.meetings.find((m) => m.id === meetingId) || state.meetings[0],
    [state.meetings, meetingId]
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(meeting?.durationSeconds || 150);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5 | 2>(1);
  const [isMuted, setIsMuted] = useState(false);

  // Left Workspace Tabs
  const [activeTab, setActiveTab] = useState<
    "summary" | "actions" | "highlights" | "ask_fathom" | "email_draft"
  >("summary");

  // Transcript Filters & Editing
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState<string>("all");
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Create Clip Modal State
  const [clipCreatorOpen, setClipCreatorOpen] = useState(false);
  const [clipTitle, setClipTitle] = useState("");
  const [clipTag, setClipTag] = useState<HighlightTag>("Key Insight");
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(25);
  const [clipExcerpt, setClipExcerpt] = useState("");
  const [clipSpeaker, setClipSpeaker] = useState("");

  // New Action Item State
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskOwner, setNewTaskOwner] = useState(meeting?.participants[0]?.name || "Hasnain Janjua");
  const [newTaskDue, setNewTaskDue] = useState("Friday");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("high");

  // Inline Edit Action Item State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskOwner, setEditTaskOwner] = useState("");
  const [editTaskDue, setEditTaskDue] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<"high" | "medium" | "low">("high");

  // Ask Fathom AI Chat State
  const [askQuestionInput, setAskQuestionInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "assistant"; text: string; citedTimestamp?: number }[]
  >([
    {
      role: "assistant",
      text: `Ask Fathom anything about "${meeting?.title}". Every answer is grounded directly in the recorded transcript with clickable timestamps.`,
    },
  ]);

  // Seek to ?t= query parameter on mount or change
  useEffect(() => {
    if (initialTimeParam > 0 && audioRef.current) {
      audioRef.current.currentTime = initialTimeParam;
      setCurrentTime(initialTimeParam);
    }
  }, [initialTimeParam]);

  if (!meeting) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-gray-400">Meeting not found.</p>
        <Link href="/meetings" className="mt-2 inline-block text-xs text-indigo-400 underline">
          Return to library
        </Link>
      </div>
    );
  }

  const activeSummary =
    meeting.summariesByTemplate[meeting.activeTemplateId] ||
    meeting.summariesByTemplate.general;

  // Determine currently active transcript utterance from currentTime
  // If currentTime is in a 1-second pause between utterances, hold on the preceding utterance
  // rather than snapping back to transcript[0].
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

  const handleSeek = (targetSeconds: number) => {
    const clamped = Math.max(0, Math.min(duration, targetSeconds));
    setCurrentTime(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSpeedCycle = () => {
    const speeds: (1 | 1.25 | 1.5 | 2)[] = [1, 1.25, 1.5, 2];
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const openClipModalForSegment = (seg?: typeof activeSegment) => {
    const target = seg || activeSegment;
    setClipTitle(`${target.speakerName} on ${meeting.accountName || "Key Takeaway"}`);
    setClipStart(target.startTime);
    setClipEnd(target.endTime);
    setClipExcerpt(target.text);
    setClipSpeaker(target.speakerName);
    setClipCreatorOpen(true);
  };

  const handleSaveClip = () => {
    if (!clipTitle.trim()) return;
    createHighlightClip(meeting.id, {
      title: clipTitle.trim(),
      tag: clipTag,
      startTime: clipStart,
      endTime: clipEnd,
      transcriptExcerpt: clipExcerpt,
      speakerName: clipSpeaker,
    });
    setClipCreatorOpen(false);
    setActiveTab("highlights");
  };

  const handleCopySummaryForSlack = () => {
    const formatted = `*${meeting.title}* (${activeSummary.templateName})\n\n*TL;DR:* ${
      activeSummary.tldr
    }\n\n*Key Decisions:*\n${activeSummary.keyDecisions
      .map((d) => `• ${d.decision} (${d.ownerName} @${formatTimestamp(d.timestampSeconds)})`)
      .join("\n")}\n\n*Action Items:*\n${meeting.actionItems
      .map((a) => `• [${a.completed ? "x" : " "}] ${a.title} — ${a.assigneeName}`)
      .join("\n")}`;
    navigator.clipboard?.writeText(formatted);
    showToast("Formatted summary & action items copied to clipboard (Slack / Notion / CRM ready)");
  };

  const handleCopyPublicShareUrl = () => {
    const url = `${window.location.origin}/share/${meeting.shareToken}`;
    navigator.clipboard?.writeText(url);
    showToast("Public unauthenticated share URL copied to clipboard!");
  };

  const handleAskFathom = (questionText?: string) => {
    const q = (questionText ?? askQuestionInput).trim();
    if (!q) return;
    setAskQuestionInput("");

    // Grounded retrieval against meeting transcript & summary
    const lower = q.toLowerCase();
    const matchedSeg =
      meeting.transcript.find((s) =>
        lower
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .some((word) => s.text.toLowerCase().includes(word))
      ) || meeting.transcript[1] || meeting.transcript[0];

    let answer = "";
    let citedSeg = matchedSeg;
    if (lower.includes("budget") || lower.includes("price") || lower.includes("cost") || lower.includes("arr")) {
      answer = `Based on the call with ${meeting.accountName || "the team"}, ${
        matchedSeg.speakerName
      } confirmed ${
        meeting.dealValue || "$84,000 in approved Q4 budget"
      } contingent on pilot validation and security sign-off: "${matchedSeg.text}"`;
    } else if (lower.includes("security") || lower.includes("soc2") || lower.includes("risk") || lower.includes("objection")) {
      const secSeg =
        meeting.transcript.find(
          (s) =>
            s.text.toLowerCase().includes("soc2") ||
            s.text.toLowerCase().includes("pain") ||
            s.text.toLowerCase().includes("security")
        ) || matchedSeg;
      citedSeg = secSeg;
      answer = `${secSeg.speakerName} highlighted the key technical/security criteria at ${formatTimestamp(
        secSeg.startTime
      )}: "${secSeg.text}"`;
    } else if (lower.includes("action") || lower.includes("next step") || lower.includes("who")) {
      answer = `There are ${meeting.actionItems.length} action items from this call: ${meeting.actionItems
        .map((a) => `${a.assigneeName} to "${a.title}" (${a.dueDate})`)
        .join("; ")}.`;
    } else {
      answer = `At ${formatTimestamp(matchedSeg.startTime)}, ${matchedSeg.speakerName} stated: "${
        matchedSeg.text
      }". Overall TL;DR: ${activeSummary.tldr}`;
    }

    setChatHistory((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", text: answer, citedTimestamp: citedSeg.startTime },
    ]);
  };

  const filteredTranscript = meeting.transcript.filter((seg) => {
    if (speakerFilter !== "all" && seg.speakerId !== speakerFilter) return false;
    if (transcriptQuery.trim()) {
      return (
        seg.text.toLowerCase().includes(transcriptQuery.toLowerCase()) ||
        seg.speakerName.toLowerCase().includes(transcriptQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-[1440px] p-4 md:p-6 space-y-5">
      {/* Hidden Real HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={meeting.mediaUrl}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (d && isFinite(d)) setDuration(Math.round(d));
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#1E2330] pb-4 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/meetings"
              className="inline-flex items-center gap-1 rounded-lg border border-[#242B3D] bg-[#131722] px-2.5 py-1 text-xs font-medium text-gray-300 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Calls</span>
            </Link>
            <span className="rounded bg-indigo-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-indigo-300 border border-indigo-500/30">
              {meeting.platform.replace("_", " ")}
            </span>
            {meeting.accountName && (
              <span className="rounded bg-[#181E2E] px-2 py-0.5 text-xs font-semibold text-[#00D4B2]">
                {meeting.accountName}
              </span>
            )}
            {meeting.dealValue && (
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-300">
                {meeting.dealValue}
              </span>
            )}
            <span className="font-mono text-xs text-gray-400">
              {formatRelativeDate(meeting.scheduledAt)} • {formatDurationHuman(duration)}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white md:text-2xl">{meeting.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openClipModalForSegment()}
            className="flex items-center gap-1.5 rounded-xl border border-[#00D4B2]/40 bg-[#00D4B2]/10 px-3 py-2 text-xs font-semibold text-[#00D4B2] hover:bg-[#00D4B2]/20"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>Highlight Current Moment ({formatTimestamp(currentTime)})</span>
          </button>

          <button
            onClick={handleCopySummaryForSlack}
            className="flex items-center gap-1.5 rounded-xl border border-[#262D40] bg-[#151A28] px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500"
          >
            <Copy className="h-3.5 w-3.5 text-indigo-400" />
            <span>Copy Summary</span>
          </button>

          <button
            onClick={handleCopyPublicShareUrl}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Copy Share Link</span>
          </button>

          <Link
            href={`/share/${meeting.shareToken}`}
            className="flex items-center gap-1 rounded-xl border border-[#262D40] bg-[#151A28] px-3 py-2 text-xs font-medium text-indigo-300 hover:text-white"
            title="Preview what logged-out external viewers see"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Public View</span>
          </Link>
        </div>
      </div>

      {(meeting.isSimulatedCapture || meeting.id.startsWith("mtg-sim-")) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Simulated Capture Session:</strong> This meeting was created via the in-app Live Capture Simulator and is paired with a real multi-speaker WAV audio recording.
            </span>
          </div>
          <button
            onClick={() => {
              deleteSimulatedMeeting(meeting.id);
              router.push("/meetings");
            }}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-rose-500/25 hover:border-rose-500/40 hover:text-rose-200 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Simulated Call</span>
          </button>
        </div>
      )}

      {/* Main Split Studio Layout: Left (Player + AI Summary/Tasks/Clips) | Right (Synchronized Transcript) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* LEFT 7 COLUMNS: Media Studio Player + Structured AI Workspace */}
        <div className="xl:col-span-7 space-y-5">
          {/* Media Player Card */}
          <div className="overflow-hidden rounded-2xl border border-[#23293A] bg-[#0E121B] shadow-xl">
            {/* Active Speaker Stage */}
            <div className="relative flex flex-col justify-between bg-gradient-to-br from-[#121726] via-[#0F1320] to-[#0A0D14] p-5 border-b border-[#1E2330]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[11px] text-emerald-300 border border-emerald-500/30">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isPlaying ? "animate-ping bg-emerald-400" : "bg-indigo-400"
                    }`}
                  />
                  {isPlaying ? "PLAYING REAL WAV AUDIO" : "READY • CLICK PLAY OR ANY TIMESTAMP"}
                </span>

                <span className="font-mono text-xs text-gray-400">
                  {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
                </span>
              </div>

              {/* Participant Speaker Tiles */}
              <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {meeting.participants.map((p) => {
                  const isSpeakingNow = activeSegment?.speakerId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        const firstBySpeaker = meeting.transcript.find(
                          (s) => s.speakerId === p.id
                        );
                        if (firstBySpeaker) handleSeek(firstBySpeaker.startTime);
                      }}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                        isSpeakingNow
                          ? "border-[#00D4B2] bg-[#162032] shadow-lg shadow-[#00D4B2]/10"
                          : "border-[#1E2436] bg-[#121622]/90 hover:border-gray-600"
                      }`}
                    >
                      <div
                        style={{ backgroundColor: p.avatarColor }}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-slate-950"
                      >
                        {p.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-bold text-white">{p.name}</p>
                          {isSpeakingNow && (
                            <span className="rounded bg-[#00D4B2]/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00D4B2]">
                              SPEAKING
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-gray-400">{p.role}</p>
                        <p className="font-mono text-[10px] text-indigo-300">
                          {p.talkTimePercentage}% talk time • {p.questionsAsked} Qs
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Live Subtitles / Active Utterance Caption Bar */}
              <div className="rounded-xl border border-[#1E2436] bg-black/45 px-4 py-2.5">
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-0.5">
                  <span className="font-semibold text-[#00D4B2]">
                    {activeSegment?.speakerName} ({activeSegment?.speakerRole})
                  </span>
                  <span className="font-mono">
                    {formatTimestamp(activeSegment?.startTime || 0)} –{" "}
                    {formatTimestamp(activeSegment?.endTime || 0)}
                  </span>
                </div>
                <p className="text-xs text-gray-100 leading-relaxed">
                  “{activeSegment?.text}”
                </p>
              </div>
            </div>

            {/* Interactive Timeline Scrubber with Chapters & Highlight Markers */}
            <div className="p-4 space-y-3 bg-[#0D1017]">
              {/* Chapter Segments Bar */}
              <div className="space-y-1.5">
                <div className="relative h-3 w-full rounded-full bg-[#1A2030] overflow-hidden cursor-pointer">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500 to-[#00D4B2] transition-all"
                    style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
                  />
                  {/* Highlight Pins on Scrubber */}
                  {meeting.highlights.map((clip) => (
                    <div
                      key={clip.id}
                      style={{ left: `${Math.min(98, (clip.startTime / duration) * 100)}%` }}
                      title={`Highlight Clip: ${clip.title} (@${formatTimestamp(clip.startTime)})`}
                      className="absolute top-0 bottom-0 w-1.5 bg-amber-400"
                    />
                  ))}
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={1}
                    value={Math.floor(currentTime)}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    aria-label="Seek recording timeline"
                    className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Chapter Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {meeting.chapters.map((ch) => {
                    const isCurrentChapter =
                      currentTime >= ch.startTime && currentTime <= ch.endTime;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => handleSeek(ch.startTime)}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                          isCurrentChapter
                            ? "bg-indigo-600/25 text-indigo-200 border border-indigo-500/40"
                            : "bg-[#151A28] text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        <span className="font-mono text-[10px] text-[#00D4B2] mr-1">
                          {formatTimestamp(ch.startTime)}
                        </span>
                        {ch.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transport Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1A1F2E]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePlay}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSeek(currentTime - 10)}
                    className="flex items-center gap-1 rounded-lg border border-[#242B3D] bg-[#141824] px-2.5 py-1.5 font-mono text-xs text-gray-300 hover:text-white"
                    title="Rewind 10 seconds"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>-10s</span>
                  </button>

                  <button
                    onClick={() => handleSeek(currentTime + 10)}
                    className="flex items-center gap-1 rounded-lg border border-[#242B3D] bg-[#141824] px-2.5 py-1.5 font-mono text-xs text-gray-300 hover:text-white"
                    title="Forward 10 seconds"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    <span>+10s</span>
                  </button>

                  <button
                    onClick={handleSpeedCycle}
                    className="rounded-lg border border-[#242B3D] bg-[#141824] px-2.5 py-1.5 font-mono text-xs font-semibold text-[#00D4B2] hover:border-[#00D4B2]"
                    title="Change playback speed"
                  >
                    {playbackRate}x Speed
                  </button>

                  <button
                    onClick={() => {
                      const nextMute = !isMuted;
                      setIsMuted(nextMute);
                      if (audioRef.current) audioRef.current.muted = nextMute;
                    }}
                    className="rounded-lg border border-[#242B3D] bg-[#141824] p-1.5 text-gray-300 hover:text-white"
                    title="Mute / Unmute"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openClipModalForSegment()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#00D4B2] px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-[#00e6c2]"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    <span>Create Clip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Structured AI Intelligence Workspace Tabs */}
          <div className="rounded-2xl border border-[#1E2330] bg-[#111520] overflow-hidden">
            {/* Tab Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E2330] bg-[#0D1017] px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveTab("summary")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "summary"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:bg-[#171C2B] hover:text-white"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Summary</span>
                </button>

                <button
                  onClick={() => setActiveTab("actions")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "actions"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:bg-[#171C2B] hover:text-white"
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>
                    Action Items ({meeting.actionItems.filter((a) => !a.completed).length} open /{" "}
                    {meeting.actionItems.length})
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("highlights")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "highlights"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:bg-[#171C2B] hover:text-white"
                  }`}
                >
                  <Scissors className="h-3.5 w-3.5" />
                  <span>Highlights & Clips ({meeting.highlights.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("ask_fathom")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "ask_fathom"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:bg-[#171C2B] hover:text-white"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Ask Fathom AI</span>
                </button>

                <button
                  onClick={() => setActiveTab("email_draft")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "email_draft"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:bg-[#171C2B] hover:text-white"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Follow-Up Email</span>
                </button>
              </div>
            </div>

            {/* TAB 1: AI SUMMARY & TEMPLATE SWITCHER */}
            {activeTab === "summary" && (
              <div className="p-5 space-y-5">
                {/* Template Switcher Bar */}
                <div className="flex flex-col justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 sm:flex-row sm:items-center">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#00D4B2]">
                      Summary Template View
                    </span>
                    <p className="text-xs text-gray-300">
                      Switch template formats to organize captured transcript notes for Sales (MEDDPICC), CS, Product, or Engineering
                    </p>
                  </div>
                  <select
                    value={meeting.activeTemplateId}
                    onChange={(e) =>
                      switchMeetingTemplate(meeting.id, e.target.value as SummaryTemplateId)
                    }
                    aria-label="Select AI Summary Template"
                    className="rounded-xl border border-indigo-500/50 bg-[#0D1017] px-3 py-2 text-xs font-semibold text-white focus:border-[#00D4B2] focus:outline-none"
                  >
                    {SUMMARY_TEMPLATES_META.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.badge})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Executive TL;DR */}
                <div className="rounded-xl border border-[#1E2436] bg-[#0D1017] p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Executive Summary • {activeSummary.templateName}
                    </span>
                    <span className="rounded bg-[#00D4B2]/15 px-2 py-0.5 font-mono text-[10px] text-[#00D4B2]">
                      {activeSummary.templateBadge}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-100">{activeSummary.tldr}</p>
                </div>

                {/* Structured Template Sections with Clickable Timestamps */}
                <div className="space-y-4">
                  {activeSummary.sections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-[#1E2436] bg-[#141824] p-4 space-y-2.5"
                    >
                      <h3 className="text-sm font-bold text-white">{section.title}</h3>
                      <ul className="space-y-2.5">
                        {section.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-3 text-xs text-gray-200 leading-relaxed"
                          >
                            <div className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#00D4B2] shrink-0" />
                              <div>
                                <span>{item.text}</span>
                                {item.speakerName && (
                                  <span className="ml-1.5 text-[11px] text-gray-400">
                                    — {item.speakerName}
                                  </span>
                                )}
                                {item.badge && (
                                  <span className="ml-2 rounded bg-indigo-500/20 px-1.5 py-0.5 font-mono text-[10px] text-indigo-300">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.timestampSeconds !== undefined && (
                              <button
                                onClick={() => handleSeek(item.timestampSeconds!)}
                                className="shrink-0 rounded-md border border-[#00D4B2]/30 bg-[#00D4B2]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#00D4B2] hover:bg-[#00D4B2] hover:text-slate-950 transition"
                                title="Jump media player to this exact moment"
                              >
                                ▶ {formatTimestamp(item.timestampSeconds)}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Key Decisions Reached */}
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-2.5">
                  <h3 className="text-sm font-bold text-emerald-300">
                    Key Decisions Reached ({activeSummary.keyDecisions.length})
                  </h3>
                  <div className="space-y-2">
                    {activeSummary.keyDecisions.map((dec) => (
                      <div
                        key={dec.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-[#0D1017] p-3"
                      >
                        <div>
                          <p className="text-xs font-medium text-white">{dec.decision}</p>
                          <p className="text-[11px] text-gray-400">
                            Decision Owner: <strong className="text-gray-200">{dec.ownerName}</strong>
                          </p>
                        </div>
                        <button
                          onClick={() => handleSeek(dec.timestampSeconds)}
                          className="shrink-0 rounded bg-emerald-500/20 px-2 py-1 font-mono text-[11px] text-emerald-300 hover:bg-emerald-500 hover:text-slate-950"
                        >
                          ▶ {formatTimestamp(dec.timestampSeconds)}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ACTION ITEMS */}
            {activeTab === "actions" && (
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-2.5 rounded-xl border border-[#23293A] bg-[#0D1017] p-3.5 sm:flex-row">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new action item from this call..."
                    className="flex-1 rounded-lg border border-[#252B3D] bg-[#141824] px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <select
                    value={newTaskOwner}
                    onChange={(e) => setNewTaskOwner(e.target.value)}
                    className="rounded-lg border border-[#252B3D] bg-[#141824] px-2.5 py-1.5 text-xs text-gray-200"
                  >
                    {meeting.participants.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newTaskPriority}
                    onChange={(e) =>
                      setNewTaskPriority(e.target.value as "high" | "medium" | "low")
                    }
                    className="rounded-lg border border-[#252B3D] bg-[#141824] px-2.5 py-1.5 text-xs text-gray-200"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button
                    onClick={() => {
                      if (!newTaskTitle.trim()) return;
                      addActionItem(meeting.id, {
                        title: newTaskTitle.trim(),
                        assigneeName: newTaskOwner,
                        dueDate: newTaskDue,
                        priority: newTaskPriority,
                        timestampSeconds: Math.floor(currentTime),
                      });
                      setNewTaskTitle("");
                    }}
                    className="flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Task</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {meeting.actionItems.map((item) => {
                    const isEditingTask = editingTaskId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-[#1E2436] bg-[#141824] p-3.5 sm:flex-row sm:items-start"
                      >
                        <div className="flex flex-1 items-start gap-3">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleActionItem(item.id)}
                            className="mt-0.5 h-4 w-4 rounded accent-[#00D4B2] cursor-pointer"
                          />
                          {isEditingTask ? (
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={editTaskTitle}
                                onChange={(e) => setEditTaskTitle(e.target.value)}
                                className="w-full rounded-lg border border-indigo-500 bg-[#0D1017] px-2.5 py-1 text-xs text-white focus:outline-none"
                              />
                              <div className="flex flex-wrap items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editTaskOwner}
                                  onChange={(e) => setEditTaskOwner(e.target.value)}
                                  placeholder="Owner"
                                  className="rounded-lg border border-[#252B3D] bg-[#0D1017] px-2 py-1 text-[11px] text-white"
                                />
                                <input
                                  type="text"
                                  value={editTaskDue}
                                  onChange={(e) => setEditTaskDue(e.target.value)}
                                  placeholder="Due"
                                  className="rounded-lg border border-[#252B3D] bg-[#0D1017] px-2 py-1 text-[11px] text-white"
                                />
                                <select
                                  value={editTaskPriority}
                                  onChange={(e) =>
                                    setEditTaskPriority(
                                      e.target.value as "high" | "medium" | "low"
                                    )
                                  }
                                  className="rounded-lg border border-[#252B3D] bg-[#0D1017] px-2 py-1 text-[11px] text-gray-200"
                                >
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                                <button
                                  onClick={() => {
                                    if (editTaskTitle.trim()) {
                                      updateActionItem(item.id, {
                                        title: editTaskTitle.trim(),
                                        assigneeName:
                                          editTaskOwner.trim() || item.assigneeName,
                                        dueDate: editTaskDue.trim() || item.dueDate,
                                        priority: editTaskPriority,
                                      });
                                    }
                                    setEditingTaskId(null);
                                  }}
                                  className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => setEditingTaskId(null)}
                                  className="flex items-center gap-1 rounded bg-[#1E2436] px-2 py-1 text-[11px] text-gray-300"
                                >
                                  <X className="h-3 w-3" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p
                                className={`text-xs font-semibold ${
                                  item.completed
                                    ? "line-through text-gray-500"
                                    : "text-white"
                                }`}
                              >
                                {item.title}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                                <span>Owner: {item.assigneeName}</span>
                                <span>•</span>
                                <span>Due: {item.dueDate}</span>
                                <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-indigo-300">
                                  {item.priority}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            onClick={() => handleSeek(item.timestampSeconds)}
                            className="shrink-0 rounded-md border border-[#00D4B2]/30 bg-[#00D4B2]/10 px-2 py-1 font-mono text-[11px] text-[#00D4B2] hover:bg-[#00D4B2] hover:text-slate-950"
                          >
                            ▶ @{formatTimestamp(item.timestampSeconds)}
                          </button>
                          {!isEditingTask && (
                            <button
                              onClick={() => {
                                setEditingTaskId(item.id);
                                setEditTaskTitle(item.title);
                                setEditTaskOwner(item.assigneeName);
                                setEditTaskDue(item.dueDate);
                                setEditTaskPriority(item.priority);
                              }}
                              className="rounded-md p-1 text-gray-400 hover:bg-indigo-500/15 hover:text-indigo-300"
                              title="Edit action item"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteActionItem(item.id)}
                            className="rounded-md p-1 text-gray-500 hover:bg-rose-500/15 hover:text-rose-400"
                            title="Delete action item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: HIGHLIGHTS & CLIPS */}
            {activeTab === "highlights" && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Share standalone video/audio snippets of critical customer moments without sharing the full call.
                  </p>
                  <button
                    onClick={() => openClipModalForSegment()}
                    className="flex items-center gap-1 rounded-lg bg-[#00D4B2] px-3 py-1.5 text-xs font-bold text-slate-950"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Highlight Clip</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {meeting.highlights.map((clip) => (
                    <div
                      key={clip.id}
                      className="rounded-xl border border-[#232A3D] bg-[#141824] p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-[#00D4B2]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#00D4B2]">
                              {clip.tag}
                            </span>
                            <span className="font-mono text-xs text-gray-400">
                              {formatTimestamp(clip.startTime)} – {formatTimestamp(clip.endTime)}
                            </span>
                          </div>
                          <h4 className="mt-1 text-sm font-bold text-white">{clip.title}</h4>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSeek(clip.startTime)}
                            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                          >
                            ▶ Play Clip
                          </button>
                          <Link
                            href={`/share/${clip.shareToken}`}
                            className="rounded-lg border border-[#2A3147] bg-[#191F2E] px-2.5 py-1 text-xs font-medium text-gray-200 hover:border-[#00D4B2]"
                          >
                            Share Link
                          </Link>
                          <button
                            onClick={() => deleteHighlightClip(meeting.id, clip.id)}
                            className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:text-rose-400"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-xs italic text-gray-300">
                        “{clip.transcriptExcerpt}” — {clip.speakerName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: ASK FATHOM AI */}
            {activeTab === "ask_fathom" && (
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "What was the approved budget & timeline?",
                    "What security or SOC2 requirements were raised?",
                    "Summarize all action items and owners",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleAskFathom(prompt)}
                      className="rounded-lg border border-[#262D40] bg-[#141824] px-2.5 py-1 text-[11px] text-indigo-300 hover:border-indigo-500"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-[#1E2436] bg-[#0D1017] p-4">
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-3 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "ml-8 bg-indigo-600/20 border border-indigo-500/30 text-white"
                          : "mr-8 bg-[#151A28] border border-[#22283A] text-gray-200"
                      }`}
                    >
                      <p>{msg.text}</p>
                      {msg.citedTimestamp !== undefined && (
                        <button
                          onClick={() => handleSeek(msg.citedTimestamp!)}
                          className="mt-2 inline-flex items-center gap-1 rounded bg-[#00D4B2]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#00D4B2]"
                        >
                          ▶ Jump to source @{formatTimestamp(msg.citedTimestamp)}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={askQuestionInput}
                    onChange={(e) => setAskQuestionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAskFathom()}
                    placeholder="Ask anything about this meeting..."
                    className="flex-1 rounded-xl border border-[#252B3D] bg-[#0D1017] px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleAskFathom()}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Ask</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: FOLLOW-UP EMAIL DRAFT */}
            {activeTab === "email_draft" && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Automated Follow-Up Email Draft
                    </h3>
                    <p className="text-xs text-gray-400">
                      Generated from active template ({activeSummary.templateName}) & extracted action items
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        `Subject: ${activeSummary.followUpEmailDraft.subject}\n\n${activeSummary.followUpEmailDraft.body}`
                      );
                      showToast("Follow-up email copied to clipboard!");
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Email Draft</span>
                  </button>
                </div>

                <div className="rounded-xl border border-[#1E2436] bg-[#0D1017] p-4 space-y-3">
                  <div className="border-b border-[#1E2330] pb-2 text-xs">
                    <span className="text-gray-400">Subject: </span>
                    <strong className="text-white">
                      {activeSummary.followUpEmailDraft.subject}
                    </strong>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-200">
                    {activeSummary.followUpEmailDraft.body}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 5 COLUMNS: Synchronized Interactive Transcript */}
        <div className="xl:col-span-5">
          <div className="flex h-[760px] flex-col rounded-2xl border border-[#1E2330] bg-[#111520] overflow-hidden">
            {/* Transcript Header & Search */}
            <div className="border-b border-[#1E2330] bg-[#0D1017] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Synchronized Transcript</h2>
                  <p className="text-[11px] text-gray-400">
                    Click any timestamp to jump audio • Hover to highlight or edit
                  </p>
                </div>
                <span className="rounded bg-[#191F2E] px-2 py-0.5 font-mono text-[10px] text-[#00D4B2]">
                  {filteredTranscript.length} segments
                </span>
              </div>

              {/* Search within transcript */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={transcriptQuery}
                  onChange={(e) => setTranscriptQuery(e.target.value)}
                  placeholder="Search within transcript..."
                  className="w-full rounded-lg border border-[#242B3D] bg-[#131722] pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Speaker Filter Chips (For Multi-Participant Navigation) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSpeakerFilter("all")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    speakerFilter === "all"
                      ? "bg-indigo-600 text-white"
                      : "bg-[#151A28] text-gray-400 hover:text-white"
                  }`}
                >
                  All Speakers
                </button>
                {meeting.participants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSpeakerFilter(p.id)}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                      speakerFilter === p.id
                        ? "bg-indigo-600 text-white"
                        : "bg-[#151A28] text-gray-300 hover:text-white"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: p.avatarColor }}
                    />
                    <span>{p.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript Utterances List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredTranscript.map((seg) => {
                const isActive = activeSegment?.id === seg.id;
                const isHighlighted = Boolean(seg.highlightId);

                return (
                  <div
                    key={seg.id}
                    className={`group rounded-xl border p-3.5 transition ${
                      isActive
                        ? "border-[#00D4B2] bg-[#152030] shadow-md"
                        : isHighlighted
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-[#1C2130] bg-[#0E121B] hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: seg.speakerColor }}
                        />
                        <span className="text-xs font-bold text-white">{seg.speakerName}</span>
                        <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                          {seg.speakerRole}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openClipModalForSegment(seg)}
                          className="opacity-80 group-hover:opacity-100 rounded border border-[#262D40] bg-[#161B29] px-1.5 py-0.5 text-[10px] text-[#00D4B2] hover:border-[#00D4B2]"
                          title="Create shareable highlight clip from this moment"
                        >
                          + Clip
                        </button>
                        <button
                          onClick={() => {
                            setEditingSegmentId(seg.id);
                            setEditingText(seg.text);
                          }}
                          className="opacity-80 group-hover:opacity-100 rounded p-1 text-gray-400 hover:text-white"
                          title="Edit transcript text"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleSeek(seg.startTime)}
                          className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition ${
                            isActive
                              ? "bg-[#00D4B2] text-slate-950"
                              : "bg-[#181E2E] text-indigo-300 hover:bg-indigo-600 hover:text-white"
                          }`}
                        >
                          {formatTimestamp(seg.startTime)}
                        </button>
                      </div>
                    </div>

                    {editingSegmentId === seg.id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-indigo-500 bg-[#090B10] p-2 text-xs text-white focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingSegmentId(null)}
                            className="rounded px-2 py-1 text-xs text-gray-400"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              updateTranscriptSegmentText(meeting.id, seg.id, editingText);
                              setEditingSegmentId(null);
                            }}
                            className="flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            <Check className="h-3 w-3" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        onClick={() => handleSeek(seg.startTime)}
                        className="mt-2 cursor-pointer text-xs leading-relaxed text-gray-200"
                      >
                        {seg.text}
                        {seg.isEdited && (
                          <span className="ml-1.5 font-mono text-[10px] text-gray-500">
                            (edited)
                          </span>
                        )}
                      </p>
                    )}

                    {isHighlighted && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        <Scissors className="h-3 w-3" />
                        <span>Highlighted Moment</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Create Highlight Clip Modal */}
      {clipCreatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262C3E] bg-[#111520] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scissors className="h-4 w-4 text-[#00D4B2]" />
                <span>Create Shareable Highlight Clip</span>
              </h3>
              <button
                onClick={() => setClipCreatorOpen(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400">
                  Clip Title
                </label>
                <input
                  type="text"
                  value={clipTitle}
                  onChange={(e) => setClipTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-400">
                    Category Tag
                  </label>
                  <select
                    value={clipTag}
                    onChange={(e) => setClipTag(e.target.value as HighlightTag)}
                    className="mt-1 w-full rounded-lg border border-[#252B3D] bg-[#0D1017] px-2 py-2 text-xs text-white"
                  >
                    <option value="Key Insight">Key Insight</option>
                    <option value="Customer Pain">Customer Pain</option>
                    <option value="Pricing Objection">Pricing Objection</option>
                    <option value="Decision">Decision</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Positive Feedback">Positive Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-400">
                    Start (Sec)
                  </label>
                  <input
                    type="number"
                    value={clipStart}
                    onChange={(e) => setClipStart(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[#252B3D] bg-[#0D1017] px-2.5 py-2 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-400">
                    End (Sec)
                  </label>
                  <input
                    type="number"
                    value={clipEnd}
                    onChange={(e) => setClipEnd(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[#252B3D] bg-[#0D1017] px-2.5 py-2 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-[#1E2330] bg-[#0D1017] p-3 text-xs text-gray-300">
                “{clipExcerpt}”
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setClipCreatorOpen(false)}
                className="rounded-lg border border-[#262C3E] px-3 py-1.5 text-xs text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClip}
                className="rounded-lg bg-[#00D4B2] px-4 py-1.5 text-xs font-bold text-slate-950"
              >
                Save & Generate Clip Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading Meeting Studio...</div>}>
      <MeetingStudioInner />
    </Suspense>
  );
}
