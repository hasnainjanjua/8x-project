"use client";

import React from "react";
import Link from "next/link";
import {
  Video,
  Clock,
  CheckCircle2,
  Scissors,
  Sparkles,
  Calendar,
  ArrowUpRight,
  Radio,
  Play,
  ExternalLink,
  Sliders,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { formatDurationHuman, formatRelativeDate, formatTimestamp } from "@/lib/utils";

export default function DashboardPage() {
  const {
    state,
    setLiveRecorderModalOpen,
    setOnboardingModalOpen,
    toggleUpcomingAutoRecord,
    toggleActionItem,
    deleteSimulatedMeeting,
    cleanupSimulatedMeetings,
  } = useWorkspace();

  const totalMeetings = state.meetings.length;
  const simulatedMeetingsCount = state.meetings.filter(
    (m) => m.isSimulatedCapture || m.id.startsWith("mtg-sim-")
  ).length;
  const externalCustomerMeetingsCount = state.meetings.filter((m) =>
    m.participants.some((p) => p.isExternal)
  ).length;
  const allActionItems = state.meetings.flatMap((m) => m.actionItems);
  const completedTasks = allActionItems.filter((a) => a.completed).length;
  const openTasksCount = allActionItems.length - completedTasks;
  const priorityActionItems = [...allActionItems].sort(
    (a, b) => Number(a.completed) - Number(b.completed)
  );
  const allHighlights = state.meetings.flatMap((m) => m.highlights);
  const totalMinutesSaved = totalMeetings * 22;

  return (
    <div className="mx-auto max-w-7xl p-5 md:p-7 space-y-7">
      {/* Top Hero Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#22283A] bg-gradient-to-r from-[#121623] via-[#141A2B] to-[#111927] p-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00D4B2]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#00D4B2] border border-[#00D4B2]/30">
              <Sparkles className="h-3 w-3" />
              Fathom AI • Demo Workspace
            </span>
            <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 font-mono text-[11px] text-indigo-300 border border-indigo-500/30">
              Sample Recordings & Synchronized Transcripts
            </span>
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Welcome back, {state.user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-gray-400 max-w-2xl">
            Your Fathom AI Notetaker is synced with{" "}
            <span className="text-gray-200 font-medium">{state.user.email}</span>. Review recordings with synchronized transcripts, switch AI summary templates, or share highlight clips publicly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {simulatedMeetingsCount > 0 && (
            <button
              onClick={cleanupSimulatedMeetings}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
              title="Safely remove simulated test meetings without resetting seeded calls"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clean Up Simulated Calls ({simulatedMeetingsCount})</span>
            </button>
          )}
          <button
            onClick={() => setLiveRecorderModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
          >
            <Radio className="h-4 w-4 text-rose-300" />
            <span>Simulate Live Call Capture</span>
          </button>
          <button
            onClick={() => setOnboardingModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[#2A3147] bg-[#161B29] px-4 py-2.5 text-xs font-semibold text-gray-200 transition hover:border-gray-500 hover:text-white"
          >
            <Sliders className="h-4 w-4 text-[#00D4B2]" />
            <span>Onboarding & Auto-Join</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Recorded Meetings</span>
            <Video className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white">{totalMeetings}</p>
          <p className="mt-1 text-[11px] text-emerald-400">
            100% transcribed with speaker diarization
          </p>
        </div>

        <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Post-Call Admin Time Saved</span>
            <Clock className="h-4 w-4 text-[#00D4B2]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white">{totalMinutesSaved} mins</p>
          <p className="mt-1 text-[11px] text-gray-400">
            22 mins/call ({externalCustomerMeetingsCount} external CRM calls, {totalMeetings} total)
          </p>
        </div>

        <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Open Action Items</span>
            <CheckCircle2 className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white">{openTasksCount}</p>
          <p className="mt-1 text-[11px] text-gray-400">
            {completedTasks} completed of {allActionItems.length} total tasks
          </p>
        </div>

        <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Shareable Highlight Clips</span>
            <Scissors className="h-4 w-4 text-pink-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white">{allHighlights.length}</p>
          <p className="mt-1 text-[11px] text-[#00D4B2]">
            {allHighlights.reduce((s, c) => s + c.viewCount, 0)} total stakeholder clip views
          </p>
        </div>
      </div>

      {/* Main Two-Column Grid: Recent Recordings & Upcoming Calendar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Recent Recorded Calls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Recent Recorded Calls</h2>
              <p className="text-xs text-gray-400">
                Click any meeting to play audio, scrub synchronized transcripts, and switch AI templates
              </p>
            </div>
            <Link
              href="/meetings"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              <span>View All Calls</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {state.meetings.map((mtg) => {
              const activeSummary = mtg.summariesByTemplate[mtg.activeTemplateId];
              return (
                <div
                  key={mtg.id}
                  className="group rounded-2xl border border-[#1E2330] bg-[#111520] p-4 transition hover:border-indigo-500/50 hover:bg-[#131826]"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-indigo-300 border border-indigo-500/30">
                          {mtg.platform.replace("_", " ")}
                        </span>
                        {mtg.accountName && (
                          <span className="rounded-md bg-[#1A2030] px-2 py-0.5 text-[11px] font-medium text-gray-300">
                            {mtg.accountName}
                          </span>
                        )}
                        {mtg.dealValue && (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                            {mtg.dealValue}
                          </span>
                        )}
                        {mtg.isSimulatedCapture && (
                          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-300 border border-amber-500/30">
                            Simulated Capture
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/meetings/${mtg.id}`}
                        className="block text-base font-bold text-white group-hover:text-indigo-300"
                      >
                        {mtg.title}
                      </Link>
                      <p className="text-xs text-gray-400">{mtg.subtitle}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {(mtg.isSimulatedCapture || mtg.id.startsWith("mtg-sim-")) && (
                        <button
                          onClick={() => deleteSimulatedMeeting(mtg.id)}
                          className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20"
                          title="Remove this simulated test call"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove Sim</span>
                        </button>
                      )}
                      <Link
                        href={`/share/${mtg.shareToken}`}
                        className="flex items-center gap-1 rounded-lg border border-[#262D40] bg-[#161B29] px-2.5 py-1.5 text-[11px] font-medium text-gray-300 hover:border-[#00D4B2] hover:text-[#00D4B2]"
                        title="Open public logged-out share page"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Share View</span>
                      </Link>
                      <Link
                        href={`/meetings/${mtg.id}`}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Open Studio</span>
                      </Link>
                    </div>
                  </div>

                  {/* AI TL;DR Preview */}
                  <div className="mt-3 rounded-xl border border-[#1B2030] bg-[#0D1017] p-3">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                      <span className="flex items-center gap-1.5 font-semibold text-[#00D4B2]">
                        <Sparkles className="h-3 w-3" />
                        AI Summary ({activeSummary?.templateName})
                      </span>
                      <span className="font-mono">
                        {formatRelativeDate(mtg.scheduledAt)} • {formatDurationHuman(mtg.durationSeconds)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-300 line-clamp-2">
                      {activeSummary?.tldr}
                    </p>
                  </div>

                  {/* Bottom Meta: Participants, Clips & Tasks */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {mtg.participants.map((p) => (
                          <div
                            key={p.id}
                            style={{ backgroundColor: p.avatarColor }}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-[#090B10] text-[10px] font-bold text-slate-950"
                            title={`${p.name} (${p.role}) — ${p.talkTimePercentage}% talk time`}
                          >
                            {p.initials}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {mtg.participants.map((p) => p.name.split(" ")[0]).join(", ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-indigo-300">
                        {mtg.highlights.length} clips
                      </span>
                      <span className="text-amber-300">
                        {mtg.actionItems.filter((a) => !a.completed).length} open / {mtg.actionItems.length} tasks
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Upcoming Calendar + Quick Action Items & Activity */}
        <div className="space-y-6">
          {/* Upcoming Calendar Panel */}
          <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#00D4B2]" />
                <h3 className="text-sm font-bold text-white">Upcoming Calendar</h3>
              </div>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                Auto-Sync On
              </span>
            </div>

            <div className="space-y-2.5">
              {state.upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-[#1D2231] bg-[#0D1017] p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-white">{ev.title}</p>
                      <p className="font-mono text-[11px] text-gray-400">{ev.scheduledStart}</p>
                    </div>
                    <button
                      onClick={() => toggleUpcomingAutoRecord(ev.id)}
                      className={`shrink-0 rounded-lg px-2 py-1 font-mono text-[10px] font-semibold transition ${
                        ev.autoRecordEnabled
                          ? "bg-[#00D4B2]/15 text-[#00D4B2] border border-[#00D4B2]/30"
                          : "bg-gray-800 text-gray-400 border border-gray-700"
                      }`}
                    >
                      {ev.autoRecordEnabled ? "Bot Auto-Join ✓" : "Bot Paused"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#181C29]">
                    <span className="text-[11px] text-gray-400">{ev.accountName}</span>
                    <button
                      onClick={() => setLiveRecorderModalOpen(true)}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      Record Now →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Action Items Widget */}
          <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Priority Action Items</h3>
              <Link
                href="/action-items"
                className="text-xs font-semibold text-indigo-400 hover:underline"
              >
                Manage All
              </Link>
            </div>
            <div className="space-y-2">
              {priorityActionItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 rounded-xl border border-[#1D2231] bg-[#0D1017] p-2.5"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleActionItem(item.id)}
                    className="mt-0.5 h-4 w-4 rounded accent-[#00D4B2] cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-medium ${
                        item.completed ? "line-through text-gray-500" : "text-gray-200"
                      }`}
                    >
                      {item.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                      <span>{item.assigneeName}</span>
                      <Link
                        href={`/meetings/${item.meetingId}?t=${item.timestampSeconds}`}
                        className="font-mono text-[#00D4B2] hover:underline"
                      >
                        @{formatTimestamp(item.timestampSeconds)}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Workspace Activity */}
          <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4">
            <h3 className="text-sm font-bold text-white mb-3">Live Workspace Activity</h3>
            <div className="space-y-3">
              {state.activities.slice(0, 4).map((act) => (
                <div key={act.id} className="border-l-2 border-indigo-500/40 pl-3">
                  <p className="text-xs font-semibold text-gray-200">{act.title}</p>
                  <p className="text-[11px] text-gray-400">{act.description}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-500">
                    {act.timestamp} • {act.actorName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
