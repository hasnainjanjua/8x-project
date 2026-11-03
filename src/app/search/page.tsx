"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Video,
  MessageSquare,
  Sparkles,
  CheckSquare,
  Clock,
  Scissors,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { formatTimestamp } from "@/lib/utils";

function DeepSearchInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams?.get("q") || "";
  const { state } = useWorkspace();

  const [query, setQuery] = useState(initialQ);
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "transcripts" | "summaries" | "actions" | "clips"
  >("all");
  const [speakerFilter, setSpeakerFilter] = useState("all");

  const allSpeakers = useMemo(() => {
    const names = new Set<string>();
    state.meetings.forEach((m) => m.participants.forEach((p) => names.add(p.name)));
    return Array.from(names);
  }, [state.meetings]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    const transcriptMatches: {
      meetingId: string;
      meetingTitle: string;
      speakerName: string;
      speakerRole: string;
      startTime: number;
      text: string;
    }[] = [];

    const summaryMatches: {
      meetingId: string;
      meetingTitle: string;
      templateName: string;
      text: string;
      timestampSeconds?: number;
    }[] = [];

    const actionMatches = state.meetings.flatMap((m) =>
      m.actionItems.filter((a) => {
        if (speakerFilter !== "all" && a.assigneeName !== speakerFilter) return false;
        if (!q) return true;
        return (
          a.title.toLowerCase().includes(q) ||
          a.assigneeName.toLowerCase().includes(q) ||
          a.meetingTitle.toLowerCase().includes(q)
        );
      })
    );

    const clipMatches = state.meetings.flatMap((m) =>
      m.highlights.filter((c) => {
        if (speakerFilter !== "all" && c.speakerName !== speakerFilter) return false;
        if (!q) return true;
        return (
          c.title.toLowerCase().includes(q) ||
          c.transcriptExcerpt.toLowerCase().includes(q) ||
          c.tag.toLowerCase().includes(q)
        );
      })
    );

    for (const m of state.meetings) {
      for (const seg of m.transcript) {
        if (speakerFilter !== "all" && seg.speakerName !== speakerFilter) continue;
        if (
          !q ||
          seg.text.toLowerCase().includes(q) ||
          seg.speakerName.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q)
        ) {
          transcriptMatches.push({
            meetingId: m.id,
            meetingTitle: m.title,
            speakerName: seg.speakerName,
            speakerRole: seg.speakerRole,
            startTime: seg.startTime,
            text: seg.text,
          });
        }
      }

      const activeSum = m.summariesByTemplate[m.activeTemplateId] || m.summariesByTemplate.general;
      if (activeSum) {
        // Match TLDR when no speaker filter is active or if query matches
        if (
          speakerFilter === "all" &&
          (!q || activeSum.tldr.toLowerCase().includes(q) || m.title.toLowerCase().includes(q))
        ) {
          summaryMatches.push({
            meetingId: m.id,
            meetingTitle: m.title,
            templateName: activeSum.templateName,
            text: activeSum.tldr,
          });
        }

        // Match structured summary sections
        for (const sec of activeSum.sections || []) {
          for (const item of sec.items) {
            if (speakerFilter !== "all" && item.speakerName && item.speakerName !== speakerFilter) {
              continue;
            }
            if (!q || item.text.toLowerCase().includes(q) || m.title.toLowerCase().includes(q)) {
              summaryMatches.push({
                meetingId: m.id,
                meetingTitle: m.title,
                templateName: activeSum.templateName,
                text: item.text,
                timestampSeconds: item.timestampSeconds,
              });
            }
          }
        }

        // Match key decisions
        for (const dec of activeSum.keyDecisions || []) {
          if (speakerFilter !== "all" && dec.ownerName !== speakerFilter) {
            continue;
          }
          if (!q || dec.decision.toLowerCase().includes(q) || m.title.toLowerCase().includes(q)) {
            summaryMatches.push({
              meetingId: m.id,
              meetingTitle: m.title,
              templateName: activeSum.templateName,
              text: `Decision (${dec.ownerName}): ${dec.decision}`,
              timestampSeconds: dec.timestampSeconds,
            });
          }
        }
      }
    }

    return {
      transcriptMatches,
      summaryMatches,
      actionMatches,
      clipMatches,
    };
  }, [query, speakerFilter, state.meetings]);

  return (
    <div className="mx-auto max-w-7xl p-5 md:p-7 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Deep Cross-Meeting Search</h1>
        <p className="text-xs text-gray-400">
          Search across every recorded call title, participant, AI summary, action item, and verbatim transcript line
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-indigo-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try 'SOC2', '$84,000', 'HubSpot', '22 minutes', '3.1%', or 'FinScale'..."
            className="w-full rounded-xl border border-[#252B3D] bg-[#0D1017] pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: "All Results" },
                {
                  id: "transcripts",
                  label: `Transcripts (${searchResults.transcriptMatches.length})`,
                },
                {
                  id: "summaries",
                  label: `AI Summaries (${searchResults.summaryMatches.length})`,
                },
                {
                  id: "actions",
                  label: `Action Items (${searchResults.actionMatches.length})`,
                },
                { id: "clips", label: `Clips (${searchResults.clipMatches.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSourceFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  sourceFilter === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-[#161B29] text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={speakerFilter}
            onChange={(e) => setSpeakerFilter(e.target.value)}
            className="rounded-lg border border-[#252B3D] bg-[#0D1017] px-3 py-1.5 text-xs text-gray-200"
          >
            <option value="all">All Speakers / Participants</option>
            {allSpeakers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Sections */}
      <div className="space-y-6">
        {(sourceFilter === "all" || sourceFilter === "transcripts") && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <MessageSquare className="h-4 w-4 text-[#00D4B2]" />
              <span>Transcript Utterance Matches ({searchResults.transcriptMatches.length})</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {searchResults.transcriptMatches.map((hit, idx) => (
                <Link
                  key={idx}
                  href={`/meetings/${hit.meetingId}?t=${hit.startTime}`}
                  className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4 transition hover:border-[#00D4B2]/50"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-white">
                      {hit.speakerName}{" "}
                      <span className="font-normal text-gray-400">({hit.speakerRole})</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-[#00D4B2]/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#00D4B2]">
                      <Clock className="h-3 w-3" />
                      ▶ {formatTimestamp(hit.startTime)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-200">“{hit.text}”</p>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-indigo-400">
                    <Video className="h-3 w-3" />
                    <span>{hit.meetingTitle}</span>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(sourceFilter === "all" || sourceFilter === "summaries") && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>AI Summary Bullet Matches ({searchResults.summaryMatches.length})</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {searchResults.summaryMatches.map((s, idx) => (
                <Link
                  key={idx}
                  href={`/meetings/${s.meetingId}${
                    s.timestampSeconds !== undefined ? `?t=${s.timestampSeconds}` : ""
                  }`}
                  className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4 transition hover:border-indigo-500/50"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-indigo-300">{s.templateName}</span>
                    {s.timestampSeconds !== undefined && (
                      <span className="font-mono text-[11px] text-[#00D4B2]">
                        ▶ @{formatTimestamp(s.timestampSeconds)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed">{s.text}</p>
                  <p className="mt-2 text-[11px] text-gray-400">{s.meetingTitle}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(sourceFilter === "all" || sourceFilter === "clips") && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Scissors className="h-4 w-4 text-amber-400" />
              <span>Matched Highlight Clips ({searchResults.clipMatches.length})</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {searchResults.clipMatches.map((c) => (
                <Link
                  key={c.id}
                  href={`/share/${c.shareToken}`}
                  className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4 transition hover:border-amber-500/50"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                      {c.tag}
                    </span>
                    <span className="font-mono text-[11px] text-gray-400">
                      {formatTimestamp(c.startTime)} – {formatTimestamp(c.endTime)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mt-1">{c.title}</p>
                  <p className="text-xs italic text-gray-300 mt-1">“{c.transcriptExcerpt}”</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(sourceFilter === "all" || sourceFilter === "actions") && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <CheckSquare className="h-4 w-4 text-emerald-400" />
              <span>Matched Action Items ({searchResults.actionMatches.length})</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {searchResults.actionMatches.map((a) => (
                <Link
                  key={a.id}
                  href={`/meetings/${a.meetingId}?t=${a.timestampSeconds}`}
                  className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4 transition hover:border-emerald-500/50"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-emerald-300">
                      Owner: {a.assigneeName}
                    </span>
                    <span className="font-mono text-[11px] text-gray-400">
                      @{formatTimestamp(a.timestampSeconds)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-white">{a.title}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{a.meetingTitle}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading Deep Search...</div>}>
      <DeepSearchInner />
    </Suspense>
  );
}
