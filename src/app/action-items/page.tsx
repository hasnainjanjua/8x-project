"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Plus,
  Clock,
  Trash2,
  ExternalLink,
  Copy,
  Filter,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { formatTimestamp } from "@/lib/utils";

export default function ActionItemsPage() {
  const { state, toggleActionItem, addActionItem, deleteActionItem, showToast } =
    useWorkspace();

  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "completed">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  // New Task Form
  const [newTitle, setNewTitle] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState(
    state.meetings[0]?.id || "mtg-acme-discovery"
  );
  const [newAssignee, setNewAssignee] = useState("Hasnain Janjua");
  const [newDue, setNewDue] = useState("Friday, 5:00 PM");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("high");

  const allItems = useMemo(
    () => state.meetings.flatMap((m) => m.actionItems),
    [state.meetings]
  );

  const uniqueOwners = useMemo(
    () => Array.from(new Set(allItems.map((i) => i.assigneeName))),
    [allItems]
  );

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (statusFilter === "open" && item.completed) return false;
      if (statusFilter === "completed" && !item.completed) return false;
      if (ownerFilter !== "all" && item.assigneeName !== ownerFilter) return false;
      if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
      return true;
    });
  }, [allItems, statusFilter, ownerFilter, priorityFilter]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addActionItem(selectedMeetingId, {
      title: newTitle.trim(),
      assigneeName: newAssignee,
      dueDate: newDue,
      priority: newPriority,
      timestampSeconds: 30,
    });
    setNewTitle("");
  };

  const handleCopyAllOpenTasks = () => {
    const openOnes = allItems.filter((i) => !i.completed);
    const text = openOnes
      .map(
        (i) =>
          `• [ ] ${i.title} (Owner: ${i.assigneeName}, Due: ${i.dueDate}) — from ${i.meetingTitle}`
      )
      .join("\n");
    navigator.clipboard?.writeText(text || "All action items completed!");
    showToast("Open action items copied for Slack / Linear / Email!");
  };

  return (
    <div className="mx-auto max-w-7xl p-5 md:p-7 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Action Items & Follow-Ups</h1>
          <p className="text-xs text-gray-400">
            AI-extracted commitments across all recorded calls with owner attribution, due dates, and timestamp jump links
          </p>
        </div>

        <button
          onClick={handleCopyAllOpenTasks}
          className="flex items-center gap-1.5 rounded-xl border border-[#262D40] bg-[#151A28] px-3.5 py-2 text-xs font-semibold text-gray-200 hover:border-indigo-500"
        >
          <Copy className="h-3.5 w-3.5 text-[#00D4B2]" />
          <span>Copy Open Tasks for Slack / CRM</span>
        </button>
      </div>

      {/* Create Action Item Card */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-[#1E2330] bg-[#111520] p-4 space-y-3"
      >
        <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5 text-[#00D4B2]" />
          <span>Create Manual Action Item</span>
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Describe commitment or follow-up task..."
            className="md:col-span-5 rounded-xl border border-[#252B3D] bg-[#0D1017] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
          <select
            value={selectedMeetingId}
            onChange={(e) => setSelectedMeetingId(e.target.value)}
            className="md:col-span-3 rounded-xl border border-[#252B3D] bg-[#0D1017] px-2.5 py-2 text-xs text-gray-200"
          >
            {state.meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            placeholder="Owner name"
            className="md:col-span-2 rounded-xl border border-[#252B3D] bg-[#0D1017] px-2.5 py-2 text-xs text-white"
          />
          <button
            type="submit"
            className="md:col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </form>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1E2330] bg-[#111520] p-3.5">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: "all", label: `All (${allItems.length})` },
              {
                id: "open",
                label: `Open (${allItems.filter((i) => !i.completed).length})`,
              },
              {
                id: "completed",
                label: `Completed (${allItems.filter((i) => i.completed).length})`,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === t.id
                  ? "bg-indigo-600 text-white"
                  : "bg-[#161B29] text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="rounded-lg border border-[#252B3D] bg-[#0D1017] px-2.5 py-1.5 text-xs text-gray-200"
          >
            <option value="all">All Owners</option>
            {uniqueOwners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
            className="rounded-lg border border-[#252B3D] bg-[#0D1017] px-2.5 py-1.5 text-xs text-gray-200"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between gap-3 rounded-2xl border border-[#1E2330] bg-[#111520] p-4 sm:flex-row sm:items-center hover:border-indigo-500/40"
          >
            <div className="flex items-start gap-3.5">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleActionItem(item.id)}
                className="mt-1 h-4 w-4 rounded accent-[#00D4B2] cursor-pointer"
              />
              <div>
                <p
                  className={`text-sm font-semibold ${
                    item.completed ? "line-through text-gray-500" : "text-white"
                  }`}
                >
                  {item.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span>
                    Owner: <strong className="text-gray-200">{item.assigneeName}</strong>
                  </span>
                  <span>•</span>
                  <span>Due: {item.dueDate}</span>
                  <span>•</span>
                  <Link
                    href={`/meetings/${item.meetingId}`}
                    className="text-indigo-400 hover:underline"
                  >
                    {item.meetingTitle}
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                  item.priority === "high"
                    ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    : item.priority === "medium"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {item.priority}
              </span>

              <Link
                href={`/meetings/${item.meetingId}?t=${item.timestampSeconds}`}
                className="flex items-center gap-1 rounded-lg border border-[#00D4B2]/30 bg-[#00D4B2]/10 px-2.5 py-1 font-mono text-xs text-[#00D4B2] hover:bg-[#00D4B2] hover:text-slate-950"
                title="Jump directly to this moment in the recording"
              >
                <Clock className="h-3 w-3" />
                <span>@{formatTimestamp(item.timestampSeconds)}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>

              <button
                onClick={() => deleteActionItem(item.id)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-500/10 hover:text-rose-400"
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-10 text-center">
            <CheckSquare className="mx-auto h-8 w-8 text-gray-500 mb-2" />
            <p className="text-sm font-semibold text-white">No action items match this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
