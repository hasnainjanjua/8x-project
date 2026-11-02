"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Video,
  MessageSquare,
  Sparkles,
  CheckSquare,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { formatTimestamp } from "@/lib/utils";

export function GlobalSearchModal() {
  const router = useRouter();
  const { state, activeSearchModalOpen, setActiveSearchModalOpen } = useWorkspace();
  const [query, setQuery] = useState("");
  const [filterScope, setFilterScope] = useState<"all" | "transcripts" | "summaries" | "tasks">(
    "all"
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        meetings: state.meetings.slice(0, 3),
        transcriptHits: [],
        summaryHits: [],
        taskHits: [],
      };
    }

    const meetings = state.meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.accountName?.toLowerCase().includes(q) ||
        m.participants.some(
          (p) => p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q)
        )
    );

    const transcriptHits: {
      meetingId: string;
      meetingTitle: string;
      speakerName: string;
      startTime: number;
      text: string;
    }[] = [];

    const summaryHits: {
      meetingId: string;
      meetingTitle: string;
      templateName: string;
      text: string;
      timestampSeconds?: number;
    }[] = [];

    const taskHits: {
      id: string;
      meetingId: string;
      meetingTitle: string;
      title: string;
      assigneeName: string;
      timestampSeconds: number;
    }[] = [];

    for (const m of state.meetings) {
      if (filterScope === "all" || filterScope === "transcripts") {
        for (const seg of m.transcript) {
          if (
            seg.text.toLowerCase().includes(q) ||
            seg.speakerName.toLowerCase().includes(q)
          ) {
            transcriptHits.push({
              meetingId: m.id,
              meetingTitle: m.title,
              speakerName: seg.speakerName,
              startTime: seg.startTime,
              text: seg.text,
            });
          }
        }
      }

      if (filterScope === "all" || filterScope === "summaries") {
        const activeSum = m.summariesByTemplate[m.activeTemplateId];
        if (activeSum?.tldr.toLowerCase().includes(q)) {
          summaryHits.push({
            meetingId: m.id,
            meetingTitle: m.title,
            templateName: activeSum.templateName,
            text: activeSum.tldr,
          });
        }
        for (const sec of activeSum?.sections || []) {
          for (const item of sec.items) {
            if (item.text.toLowerCase().includes(q)) {
              summaryHits.push({
                meetingId: m.id,
                meetingTitle: m.title,
                templateName: activeSum.templateName,
                text: item.text,
                timestampSeconds: item.timestampSeconds,
              });
            }
          }
        }
      }

      if (filterScope === "all" || filterScope === "tasks") {
        for (const t of m.actionItems) {
          if (
            t.title.toLowerCase().includes(q) ||
            t.assigneeName.toLowerCase().includes(q)
          ) {
            taskHits.push({
              id: t.id,
              meetingId: m.id,
              meetingTitle: m.title,
              title: t.title,
              assigneeName: t.assigneeName,
              timestampSeconds: t.timestampSeconds,
            });
          }
        }
      }
    }

    return {
      meetings,
      transcriptHits: transcriptHits.slice(0, 6),
      summaryHits: summaryHits.slice(0, 4),
      taskHits: taskHits.slice(0, 4),
    };
  }, [query, filterScope, state.meetings]);

  if (!activeSearchModalOpen) return null;

  const navigateTo = (url: string) => {
    setActiveSearchModalOpen(false);
    router.push(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 pt-16 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#262C3E] bg-[#111520] shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-[#1E2330] px-4 py-3.5">
          <Search className="h-5 w-5 text-indigo-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across meeting titles, speakers, transcripts (e.g. 'SOC2', '$84,000', 'HubSpot', 'Elena')..."
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="rounded p-1 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setActiveSearchModalOpen(false)}
            className="rounded-lg border border-[#262C3E] px-2 py-1 font-mono text-[10px] text-gray-400 hover:text-white"
          >
            ESC
          </button>
        </div>

        {/* Scope Filter Pills */}
        <div className="flex items-center justify-between border-b border-[#1E2330] bg-[#0D1017] px-4 py-2">
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "all", label: "All Sources" },
                { id: "transcripts", label: "Transcripts" },
                { id: "summaries", label: "AI Summaries" },
                { id: "tasks", label: "Action Items" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterScope(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  filterScope === tab.id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:bg-[#181D2B] hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigateTo(`/search?q=${encodeURIComponent(query)}`)}
            className="flex items-center gap-1 text-xs font-medium text-[#00D4B2] hover:underline"
          >
            <span>Open Full Search Page</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-5">
          {/* Matched Meetings */}
          {results.meetings.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <Video className="h-3.5 w-3.5 text-indigo-400" />
                <span>{query ? "Matched Meetings" : "Recent Meetings"}</span>
              </div>
              <div className="space-y-1.5">
                {results.meetings.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => navigateTo(`/meetings/${m.id}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-[#1E2330] bg-[#151A28] px-3.5 py-2.5 text-left transition hover:border-indigo-500/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{m.title}</p>
                      <p className="text-xs text-gray-400">
                        {m.accountName} • {m.participants.map((p) => p.name).join(", ")}
                      </p>
                    </div>
                    <span className="rounded bg-indigo-500/15 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                      Open Call
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transcript Snippets with Timestamp Jump */}
          {results.transcriptHits.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <MessageSquare className="h-3.5 w-3.5 text-[#00D4B2]" />
                <span>Exact Transcript Moments ({results.transcriptHits.length})</span>
              </div>
              <div className="space-y-2">
                {results.transcriptHits.map((hit, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigateTo(`/meetings/${hit.meetingId}?t=${hit.startTime}`)}
                    className="w-full rounded-xl border border-[#1E2330] bg-[#141824] p-3 text-left transition hover:border-[#00D4B2]/50"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-300">{hit.speakerName}</span>
                      <span className="flex items-center gap-1 rounded bg-[#00D4B2]/15 px-2 py-0.5 font-mono text-[11px] text-[#00D4B2]">
                        <Clock className="h-3 w-3" />
                        Jump to {formatTimestamp(hit.startTime)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-200 line-clamp-2">“{hit.text}”</p>
                    <p className="mt-1 text-[11px] text-gray-500">{hit.meetingTitle}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary Hits */}
          {results.summaryHits.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>AI Summary Insights ({results.summaryHits.length})</span>
              </div>
              <div className="space-y-2">
                {results.summaryHits.map((hit, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      navigateTo(
                        `/meetings/${hit.meetingId}${
                          hit.timestampSeconds !== undefined ? `?t=${hit.timestampSeconds}` : ""
                        }`
                      )
                    }
                    className="w-full rounded-xl border border-[#1E2330] bg-[#141824] p-3 text-left transition hover:border-amber-500/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-amber-300">
                        {hit.templateName}
                      </span>
                      {hit.timestampSeconds !== undefined && (
                        <span className="font-mono text-[11px] text-gray-400">
                          @{formatTimestamp(hit.timestampSeconds)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-200">{hit.text}</p>
                    <p className="mt-1 text-[11px] text-gray-500">{hit.meetingTitle}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Item Hits */}
          {results.taskHits.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                <span>Action Items ({results.taskHits.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.taskHits.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => navigateTo(`/meetings/${t.meetingId}?t=${t.timestampSeconds}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-[#1E2330] bg-[#141824] px-3 py-2 text-left hover:border-emerald-500/40"
                  >
                    <div>
                      <p className="text-xs font-medium text-white">{t.title}</p>
                      <p className="text-[11px] text-gray-400">
                        Owner: {t.assigneeName} • {t.meetingTitle}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400">
                      @{formatTimestamp(t.timestampSeconds)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query &&
            results.meetings.length === 0 &&
            results.transcriptHits.length === 0 &&
            results.summaryHits.length === 0 &&
            results.taskHits.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-gray-300">
                  No matches found for “{query}”
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Try searching for “SOC2”, “HubSpot”, “Elena”, “$84,000”, or “WER”.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
