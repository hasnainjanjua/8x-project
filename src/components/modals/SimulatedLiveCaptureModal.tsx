"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Radio,
  X,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Play,
  Square,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { HighlightTag, Meeting, SummaryTemplateId } from "@/types/fathom";
import { SUMMARY_TEMPLATES_META } from "@/data/seed-meetings";
import { formatTimestamp } from "@/lib/utils";

const LIVE_STREAM_SCRIPT = [
  {
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    text: "Welcome to our live technical evaluation session. How is your engineering team currently handling post-call architecture notes and action item handoffs?",
  },
  {
    speakerId: "spk-prospect",
    speakerName: "Jordan Taylor",
    speakerRole: "VP of Engineering, CloudNova",
    speakerColor: "#00D4B2",
    isExternal: true,
    text: "Our primary requirement is capturing key architectural decisions and customer commitments without distracting engineers during high-stakes calls.",
  },
  {
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    text: "Anytime a stakeholder states a requirement or objection, you click a one-click Highlight button in the Fathom bar and it timestamps the exact segment.",
  },
  {
    speakerId: "spk-prospect",
    speakerName: "Jordan Taylor",
    speakerRole: "VP of Engineering, CloudNova",
    speakerColor: "#00D4B2",
    isExternal: true,
    text: "That solves our sprint handoff bottleneck. Can we move forward with a 30-seat engineering trial starting Monday and sync action items to Linear?",
  },
];

export function SimulatedLiveCaptureModal() {
  const router = useRouter();
  const { liveRecorderModalOpen, setLiveRecorderModalOpen, addSimulatedMeeting } =
    useWorkspace();

  const [meetingTitle, setMeetingTitle] = useState(
    "CloudNova — Enterprise Architecture & 30-Seat Trial Kickoff"
  );
  const [accountName, setAccountName] = useState("CloudNova ($48k ARR)");
  const [platform, setPlatform] = useState<"zoom" | "google_meet" | "teams">("zoom");
  const [templateId, setTemplateId] = useState<SummaryTemplateId>("meddpicc");
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveHighlights, setLiveHighlights] = useState<
    { tag: HighlightTag; timestamp: number; note: string }[]
  >([]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!liveRecorderModalOpen) return null;

  const visibleScriptCount = isRecording
    ? Math.min(LIVE_STREAM_SCRIPT.length, Math.floor(elapsedSeconds / 3) + 1)
    : 1;

  const triggerLiveHighlight = (tag: HighlightTag) => {
    const activeLine =
      LIVE_STREAM_SCRIPT[Math.min(visibleScriptCount - 1, LIVE_STREAM_SCRIPT.length - 1)];
    setLiveHighlights((prev) => [
      ...prev,
      {
        tag,
        timestamp: elapsedSeconds || 12,
        note: activeLine.text,
      },
    ]);
  };

  const handleCompleteAndProcess = async () => {
    setIsRecording(false);
    const newId = `mtg-sim-${Date.now()}`;
    const segments = LIVE_STREAM_SCRIPT.map((line, idx) => ({
      id: `${newId}-seg-${idx}`,
      meetingId: newId,
      speakerId: line.speakerId,
      speakerName: line.speakerName,
      speakerRole: line.speakerRole,
      speakerColor: line.speakerColor,
      isExternal: line.isExternal,
      startTime: idx * 25,
      endTime: (idx + 1) * 25,
      text: line.text,
    }));

    const countQuestions = (spkId: string) =>
      segments
        .filter((s) => s.speakerId === spkId)
        .reduce((acc, s) => acc + (s.text.match(/\?/g) || []).length, 0);

    const hasnainQs = countQuestions("spk-hasnain");
    const prospectQs = countQuestions("spk-prospect");

    const baseSummary = {
      tldr: `Simulated Live Capture for ${meetingTitle}: Validated real-time highlight bookmarking and agreed to launch a 30-seat CloudNova engineering trial starting Monday with Linear action item sync.`,
      sections: [
        {
          id: `${newId}-s1`,
          title: "Key Discussion Points & Requirements",
          items: [
            {
              id: `${newId}-i1`,
              text: "CloudNova needs to capture architectural decisions and customer commitments without manual note-taking during calls.",
              timestampSeconds: 25,
              speakerName: "Jordan Taylor",
              badge: "Customer Pain",
            },
            {
              id: `${newId}-i2`,
              text: "Demonstrated one-click live Highlight tagging synchronized with the call timeline.",
              timestampSeconds: 50,
              speakerName: "Hasnain Janjua",
            },
          ],
        },
      ],
      keyDecisions: [
        {
          id: `${newId}-d1`,
          decision: "Launch 30-seat CloudNova engineering trial on Monday with automated Linear task sync.",
          timestampSeconds: 75,
          ownerName: "Jordan Taylor",
          impact: "high" as const,
        },
      ],
      followUpEmailDraft: {
        subject: `Recap & Trial Next Steps: ${meetingTitle}`,
        body: `Hi Jordan,\n\nGreat speaking today! As agreed, we are provisioning your 30-seat CloudNova trial for Monday and enabling Linear action-item sync.\n\nBest,\nHasnain`,
      },
    };

    const allTemplates = SUMMARY_TEMPLATES_META.reduce((acc, tpl) => {
      acc[tpl.id] = {
        templateId: tpl.id,
        templateName: tpl.name,
        templateBadge: tpl.badge,
        ...baseSummary,
      };
      return acc;
    }, {} as Meeting["summariesByTemplate"]);

    const signClipServerSide = async (params: {
      title: string;
      tag: HighlightTag;
      startTime: number;
      endTime: number;
      speakerName: string;
      transcriptExcerpt: string;
    }): Promise<string> => {
      try {
        const res = await fetch("/api/share-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: "mtg-eng-architecture",
            title: params.title,
            tag: params.tag,
            startTime: params.startTime,
            endTime: params.endTime,
            speakerName: params.speakerName,
            transcriptExcerpt: params.transcriptExcerpt,
            createdBy: "Hasnain Janjua",
          }),
        });
        const data = await res.json();
        if (data?.ok && typeof data.token === "string") {
          return data.token;
        }
      } catch {
        // Fallback to local clip id if offline
      }
      return `${newId}-clip-local`;
    };

    const resolvedHighlights =
      liveHighlights.length > 0
        ? await Promise.all(
            liveHighlights.map(async (lh, idx) => {
              const startSec = Math.max(0, Math.min(80, lh.timestamp - 5));
              const endSec = Math.min(105, startSec + 25);
              const title = `Live Highlight: ${lh.tag}`;
              const shareToken = await signClipServerSide({
                title,
                tag: lh.tag,
                startTime: startSec,
                endTime: endSec,
                speakerName: "Jordan Taylor",
                transcriptExcerpt: lh.note,
              });
              return {
                id: `${newId}-clip-${idx}`,
                meetingId: newId,
                meetingTitle,
                title,
                tag: lh.tag,
                startTime: startSec,
                endTime: endSec,
                createdBy: "Hasnain Janjua",
                createdAt: new Date().toISOString(),
                shareToken,
                viewCount: 1,
                speakerName: "Jordan Taylor",
                transcriptExcerpt: lh.note,
              };
            })
          )
        : [
            {
              id: `${newId}-clip-default`,
              meetingId: newId,
              meetingTitle,
              title: "30-Seat Engineering Trial Commitment",
              tag: "Decision" as HighlightTag,
              startTime: 50,
              endTime: 90,
              createdBy: "Hasnain Janjua",
              createdAt: new Date().toISOString(),
              shareToken: await signClipServerSide({
                title: "30-Seat Engineering Trial Commitment",
                tag: "Decision",
                startTime: 50,
                endTime: 90,
                speakerName: "Jordan Taylor",
                transcriptExcerpt:
                  "That solves our sprint handoff bottleneck. Can we move forward with a 30-seat engineering trial starting Monday and sync action items to Linear?",
              }),
              viewCount: 1,
              speakerName: "Jordan Taylor",
              transcriptExcerpt:
                "That solves our sprint handoff bottleneck. Can we move forward with a 30-seat engineering trial starting Monday and sync action items to Linear?",
            },
          ];

    const newMeeting: Meeting = {
      id: newId,
      title: meetingTitle,
      subtitle: "Simulated Live Call Capture • Paired with Sample Audio",
      category: "sales_discovery",
      platform,
      status: "completed",
      scope: "my_calls",
      visibility: "public_link",
      shareToken: `share-sim-${Date.now()}`,
      scheduledAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      durationSeconds: 100,
      hostId: "usr-hasnain",
      hostName: "Hasnain Janjua",
      accountName,
      dealValue: "$48,000 ARR",
      dealStage: "Trial Provisioning",
      mediaUrl: "/media/meeting-cloudnova-sim.wav",
      mediaType: "audio",
      isSimulatedCapture: true,
      activeTemplateId: templateId,
      participants: [
        {
          id: "spk-hasnain",
          name: "Hasnain Janjua",
          email: "hasnain@fathom.video",
          role: "Lead Product Engineer",
          company: "Fathom AI",
          isExternal: false,
          avatarColor: "#6366F1",
          initials: "HJ",
          talkTimeSeconds: 50,
          talkTimePercentage: 50,
          questionsAsked: hasnainQs,
        },
        {
          id: "spk-prospect",
          name: "Jordan Taylor",
          email: "jordan@cloudnova.io",
          role: "VP of Engineering",
          company: "CloudNova",
          isExternal: true,
          avatarColor: "#00D4B2",
          initials: "JT",
          talkTimeSeconds: 50,
          talkTimePercentage: 50,
          questionsAsked: prospectQs,
        },
      ],
      transcript: segments,
      chapters: [
        {
          id: `${newId}-ch1`,
          title: "Live Evaluation & Requirements",
          startTime: 0,
          endTime: 50,
          summary: "Overview of live highlight tagging and architecture decision capture.",
        },
        {
          id: `${newId}-ch2`,
          title: "30-Seat Engineering Trial Commitment",
          startTime: 50,
          endTime: 100,
          summary: "Confirmed Monday launch for 30-seat trial with Linear sync.",
        },
      ],
      summariesByTemplate: allTemplates,
      actionItems: [
        {
          id: `${newId}-act1`,
          meetingId: newId,
          meetingTitle,
          title: "Provision 30-seat CloudNova trial workspace and connect Linear integration",
          assigneeId: "spk-hasnain",
          assigneeName: "Hasnain Janjua",
          assigneeEmail: "hasnain@fathom.video",
          assigneeCompany: "Fathom AI",
          dueDate: "Mon, Nov 9",
          completed: false,
          priority: "high",
          timestampSeconds: 75,
          syncedTo: ["linear", "slack"],
        },
      ],
      highlights: resolvedHighlights,
      metrics: {
        questionsAsked: hasnainQs + prospectQs,
        longestMonologueSeconds: 25,
        sentimentScore: "positive",
        engagementScore: 95,
      },
    };

    addSimulatedMeeting(newMeeting);
    setLiveRecorderModalOpen(false);
    setElapsedSeconds(0);
    setLiveHighlights([]);
    router.push(`/meetings/${newId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#262C3E] bg-[#111520] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E2330] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 border border-rose-500/30">
              <Radio className="h-4 w-4 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Simulated Live Meeting Capture
                </h2>
                <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                  SIMULATED BOT LAYER
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Simulates Fathom’s in-call floating control panel & real-time highlight bookmarking
              </p>
            </div>
          </div>
          <button
            onClick={() => setLiveRecorderModalOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-[#1B2030] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Transparent Disclosure Banner */}
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-5 py-2.5 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-amber-200">
            <strong>Simulation Notice:</strong> Live meeting capture is simulated in-browser to demonstrate Fathom’s real-time highlight bookmarking workflow and pairs the resulting session with a sample audio recording.
          </p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Meeting Title
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Account / Deal Context
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as typeof platform)}
                className="mt-1 w-full rounded-lg border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="zoom">Zoom Meeting</option>
                <option value="google_meet">Google Meet</option>
                <option value="teams">Microsoft Teams</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Default AI Summary Template
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value as SummaryTemplateId)}
                className="mt-1 w-full rounded-lg border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                {SUMMARY_TEMPLATES_META.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live In-Call Floating Controller Simulation */}
          <div className="rounded-xl border border-[#23293A] bg-[#0B0E15] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isRecording ? "animate-ping bg-rose-500" : "bg-gray-500"
                  }`}
                />
                <span className="font-mono text-xs font-semibold text-white">
                  {isRecording
                    ? `LIVE CAPTURE • ${formatTimestamp(elapsedSeconds)}`
                    : "READY TO START CAPTURE"}
                </span>
              </div>
              {!isRecording ? (
                <button
                  onClick={() => setIsRecording(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start Live Stream</span>
                </button>
              ) : (
                <button
                  onClick={handleCompleteAndProcess}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>End & Generate AI Summary</span>
                </button>
              )}
            </div>

            {/* One-Click Live Highlight Tagging Bar */}
            <div className="mt-3 border-t border-[#1C2130] pt-3">
              <p className="text-[11px] font-medium text-gray-400 mb-2">
                Click during the call to bookmark a moment (Fathom One-Click Highlight):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    "Customer Pain",
                    "Key Insight",
                    "Pricing Objection",
                    "Decision",
                    "Feature Request",
                  ] as HighlightTag[]
                ).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => triggerLiveHighlight(tag)}
                    className="flex items-center gap-1 rounded-lg border border-[#262D40] bg-[#151A28] px-2.5 py-1 text-[11px] font-medium text-gray-200 hover:border-[#00D4B2] hover:text-[#00D4B2]"
                  >
                    <Scissors className="h-3 w-3 text-[#00D4B2]" />
                    <span>+ {tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Transcript Feed Preview */}
            <div className="mt-3 max-h-36 space-y-2 overflow-y-auto rounded-lg border border-[#191E2C] bg-[#0F131D] p-3">
              {LIVE_STREAM_SCRIPT.slice(0, visibleScriptCount).map((line, i) => (
                <div key={i} className="text-xs">
                  <span className="font-semibold text-indigo-400">{line.speakerName}: </span>
                  <span className="text-gray-300">{line.text}</span>
                </div>
              ))}
            </div>

            {liveHighlights.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {liveHighlights.map((lh, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-[#00D4B2]/15 px-2 py-0.5 text-[10px] font-medium text-[#00D4B2]"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Bookmarked {lh.tag} @{formatTimestamp(lh.timestamp)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#1E2330] bg-[#0D1017] px-5 py-3.5">
          <span className="text-xs text-gray-400">
            Creates a playable meeting with transcript, 6 AI templates & action items
          </span>
          <button
            onClick={handleCompleteAndProcess}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Process & Open Meeting Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
