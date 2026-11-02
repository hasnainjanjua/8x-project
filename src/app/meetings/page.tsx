"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Play,
  ExternalLink,
  Scissors,
  CheckSquare,
  Radio,
  Sparkles,
  Users,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { MeetingCategory, MeetingPlatform } from "@/types/fathom";
import { formatDurationHuman, formatRelativeDate } from "@/lib/utils";

export default function MeetingsLibraryPage() {
  const {
    state,
    setLiveRecorderModalOpen,
    deleteSimulatedMeeting,
    cleanupSimulatedMeetings,
  } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeTab, setScopeTab] = useState<"all" | "my_calls" | "team_calls" | "external">("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | MeetingPlatform>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | MeetingCategory>("all");

  const simulatedCount = useMemo(
    () =>
      state.meetings.filter(
        (m) => m.isSimulatedCapture || m.id.startsWith("mtg-sim-")
      ).length,
    [state.meetings]
  );

  const filteredMeetings = useMemo(() => {
    return state.meetings.filter((m) => {
      if (scopeTab === "my_calls" && m.scope !== "my_calls") return false;
      if (scopeTab === "team_calls" && m.scope !== "team_calls") return false;
      if (scopeTab === "external" && !m.participants.some((p) => p.isExternal)) return false;
      if (platformFilter !== "all" && m.platform !== platformFilter) return false;
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = m.title.toLowerCase().includes(q);
        const inAccount = m.accountName?.toLowerCase().includes(q);
        const inParticipants = m.participants.some(
          (p) => p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q)
        );
        const inTranscript = m.transcript.some((t) => t.text.toLowerCase().includes(q));
        return inTitle || inAccount || inParticipants || inTranscript;
      }
      return true;
    });
  }, [state.meetings, scopeTab, platformFilter, categoryFilter, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl p-5 md:p-7 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Recordings & Call Library</h1>
          <p className="text-xs text-gray-400">
            Browse all recorded customer calls, product reviews, and engineering standups with speaker talk-time ratios
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {simulatedCount > 0 && (
            <button
              onClick={cleanupSimulatedMeetings}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
              title="Safely remove only simulated test recordings"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clean Up Simulated Calls ({simulatedCount})</span>
            </button>
          )}
          <button
            onClick={() => setLiveRecorderModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
          >
            <Radio className="h-4 w-4 text-rose-300" />
            <span>Simulate New Call Recording</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#1E2330] bg-[#111520] p-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Scope Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "all", label: "All Calls" },
              { id: "my_calls", label: "My Calls" },
              { id: "team_calls", label: "Team Calls" },
              { id: "external", label: "External Customer Calls" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setScopeTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                scopeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-[#161B29] text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, speaker, keyword..."
              className="w-full rounded-lg border border-[#242B3D] bg-[#0D1017] pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as typeof platformFilter)}
              className="rounded-lg border border-[#242B3D] bg-[#0D1017] px-2.5 py-1.5 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Platforms</option>
              <option value="zoom">Zoom</option>
              <option value="google_meet">Google Meet</option>
              <option value="teams">Microsoft Teams</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
              className="rounded-lg border border-[#242B3D] bg-[#0D1017] px-2.5 py-1.5 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="sales_discovery">Sales Discovery</option>
              <option value="customer_qbr">Customer QBR</option>
              <option value="product_feedback">Product & UX</option>
              <option value="engineering_sync">Engineering Sync</option>
            </select>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.map((mtg) => {
          const activeSummary = mtg.summariesByTemplate[mtg.activeTemplateId];
          return (
            <div
              key={mtg.id}
              className="rounded-2xl border border-[#1E2330] bg-[#111520] p-5 transition hover:border-indigo-500/40"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-indigo-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-indigo-300 border border-indigo-500/30">
                      {mtg.platform.replace("_", " ")}
                    </span>
                    <span className="rounded bg-[#1A2030] px-2 py-0.5 font-mono text-[10px] text-gray-300">
                      {formatRelativeDate(mtg.scheduledAt)} • {formatDurationHuman(mtg.durationSeconds)}
                    </span>
                    {mtg.accountName && (
                      <span className="rounded bg-[#1E2538] px-2 py-0.5 text-[11px] font-medium text-[#00D4B2]">
                        {mtg.accountName}
                      </span>
                    )}
                    {mtg.dealValue && (
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                        {mtg.dealValue}
                      </span>
                    )}
                    {mtg.isSimulatedCapture && (
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-300 border border-amber-500/30">
                        Simulated Live Capture
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/meetings/${mtg.id}`}
                    className="block text-lg font-bold text-white hover:text-indigo-300"
                  >
                    {mtg.title}
                  </Link>
                  <p className="text-xs text-gray-400">{mtg.subtitle}</p>
                </div>

                <div className="flex flex-wrap shrink-0 items-center gap-2">
                  {(mtg.isSimulatedCapture || mtg.id.startsWith("mtg-sim-")) && (
                    <button
                      onClick={() => deleteSimulatedMeeting(mtg.id)}
                      className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
                      title="Remove this simulated test recording"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Simulation</span>
                    </button>
                  )}
                  <Link
                    href={`/share/${mtg.shareToken}`}
                    className="flex items-center gap-1.5 rounded-xl border border-[#262D40] bg-[#161B29] px-3 py-2 text-xs font-medium text-gray-200 hover:border-[#00D4B2] hover:text-[#00D4B2]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Public Share Link</span>
                  </Link>
                  <Link
                    href={`/meetings/${mtg.id}`}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Review Call & Transcript</span>
                  </Link>
                </div>
              </div>

              {/* AI Summary & Speaker Talk-Time Bar */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-xl border border-[#1B2030] bg-[#0D1017] p-3.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-semibold text-[#00D4B2]">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Active Template: {activeSummary?.templateName}</span>
                    </span>
                    <span className="font-mono text-[11px] text-gray-500">
                      6 Switchable Templates Ready
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-300">
                    {activeSummary?.tldr}
                  </p>
                </div>

                {/* Multi-Participant Talk Ratio Breakdown */}
                <div className="rounded-xl border border-[#1B2030] bg-[#0D1017] p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-200 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Speaker Talk Ratio ({mtg.participants.length})</span>
                      </span>
                      <span className="font-mono text-[10px] text-gray-400">
                        {mtg.metrics.questionsAsked} Qs asked
                      </span>
                    </div>

                    {/* Visual Distribution Bar */}
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#191F2E]">
                      {mtg.participants.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            width: `${p.talkTimePercentage}%`,
                            backgroundColor: p.avatarColor,
                          }}
                          title={`${p.name}: ${p.talkTimePercentage}%`}
                        />
                      ))}
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {mtg.participants.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 text-[11px] text-gray-300"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: p.avatarColor }}
                          />
                          <span>{p.name.split(" ")[0]}</span>
                          <span className="font-mono text-[10px] text-gray-500">
                            {p.talkTimePercentage}%
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#181C29] pt-2 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1 text-[#00D4B2]">
                      <Scissors className="h-3 w-3" />
                      {mtg.highlights.length} Highlight Clips
                    </span>
                    <span className="flex items-center gap-1 text-amber-300">
                      <CheckSquare className="h-3 w-3" />
                      {mtg.actionItems.filter((a) => !a.completed).length} Open / {mtg.actionItems.length} Tasks
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredMeetings.length === 0 && (
          <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-12 text-center">
            <p className="text-sm font-semibold text-white">
              No recorded meetings match your current filter
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Try clearing your search query or switching back to “All Calls”.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
