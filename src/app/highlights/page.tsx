"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Scissors,
  Play,
  Share2,
  ExternalLink,
  Eye,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { HighlightTag } from "@/types/fathom";
import { formatTimestamp } from "@/lib/utils";

export default function HighlightsLibraryPage() {
  const { state, deleteHighlightClip, showToast } = useWorkspace();
  const [selectedTag, setSelectedTag] = useState<"all" | HighlightTag>("all");

  const allClips = useMemo(
    () => state.meetings.flatMap((m) => m.highlights),
    [state.meetings]
  );

  const filteredClips = useMemo(() => {
    if (selectedTag === "all") return allClips;
    return allClips.filter((c) => c.tag === selectedTag);
  }, [allClips, selectedTag]);

  const handleCopyClipLink = (shareToken: string) => {
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard?.writeText(url);
    showToast("Public clip link copied to clipboard! Accessible without login.");
  };

  return (
    <div className="mx-auto max-w-7xl p-5 md:p-7 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Highlights & Shareable Clips</h1>
          <p className="text-xs text-gray-400">
            Curated video/audio snippets of key customer insights, pricing objections, and executive decisions
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="rounded-lg border border-[#1E2330] bg-[#111520] px-3 py-1.5 font-mono">
            {allClips.length} Clips • {allClips.reduce((acc, c) => acc + c.viewCount, 0)} External Views
          </span>
        </div>
      </div>

      {/* Category Tag Filter */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#1E2330] bg-[#111520] p-3.5">
        {(
          [
            "all",
            "Customer Pain",
            "Key Insight",
            "Decision",
            "Feature Request",
            "Positive Feedback",
            "Pricing Objection",
          ] as const
        ).map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedTag === tag
                ? "bg-indigo-600 text-white"
                : "bg-[#161B29] text-gray-400 hover:text-white"
            }`}
          >
            {tag === "all" ? "All Highlights" : tag}
          </button>
        ))}
      </div>

      {/* Clips Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredClips.map((clip) => (
          <div
            key={clip.id}
            className="flex flex-col justify-between rounded-2xl border border-[#1E2330] bg-[#111520] p-5 transition hover:border-[#00D4B2]/50"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#00D4B2]/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#00D4B2] border border-[#00D4B2]/30">
                  <Scissors className="h-3 w-3" />
                  {clip.tag}
                </span>
                <div className="flex items-center gap-3 font-mono text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-indigo-400" />
                    {clip.viewCount} views
                  </span>
                  <span>
                    {formatTimestamp(clip.startTime)} – {formatTimestamp(clip.endTime)}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white">{clip.title}</h3>
              <p className="text-xs text-indigo-300 font-medium">{clip.meetingTitle}</p>

              <blockquote className="rounded-xl border border-[#1B2130] bg-[#0D1017] p-3.5 text-xs italic leading-relaxed text-gray-200">
                “{clip.transcriptExcerpt}”
                <footer className="mt-1.5 not-italic font-semibold text-gray-400">
                  — {clip.speakerName}
                </footer>
              </blockquote>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#1C2130] pt-3.5">
              <div className="flex items-center gap-2">
                <Link
                  href={`/meetings/${clip.meetingId}?t=${clip.startTime}`}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Play in Meeting Studio</span>
                </Link>
                <Link
                  href={`/share/${clip.shareToken}`}
                  className="flex items-center gap-1 rounded-xl border border-[#262D40] bg-[#161B29] px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-[#00D4B2] hover:text-[#00D4B2]"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Open Public Clip View</span>
                </Link>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopyClipLink(clip.shareToken)}
                  className="flex items-center gap-1 rounded-lg border border-[#262D40] px-2.5 py-1.5 text-xs text-gray-300 hover:text-white"
                  title="Copy public link"
                >
                  <Share2 className="h-3.5 w-3.5 text-[#00D4B2]" />
                  <span>Copy Link</span>
                </button>
                <button
                  onClick={() => deleteHighlightClip(clip.meetingId, clip.id)}
                  className="rounded-lg p-1.5 text-gray-500 hover:text-rose-400"
                  title="Delete clip"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
