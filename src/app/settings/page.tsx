"use client";

import React, { useState } from "react";
import {
  User,
  Sliders,
  Link2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Database,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { SUMMARY_TEMPLATES_META } from "@/data/seed-meetings";
import { SummaryTemplateId } from "@/types/fathom";

export default function SettingsPage() {
  const {
    state,
    updateUserProfile,
    updateUserPreferences,
    toggleIntegration,
    addCustomTemplate,
    cleanupSimulatedMeetings,
    resetDemoWorkspace,
  } = useWorkspace();

  const [name, setName] = useState(state.user.name);
  const [email, setEmail] = useState(state.user.email);
  const [role, setRole] = useState(state.user.role);
  const [workspaceName, setWorkspaceName] = useState(state.user.workspaceName);
  const [customAiPrompt, setCustomAiPrompt] = useState(
    state.user.preferences.customAiInstructions
  );
  const [confirmFullReset, setConfirmFullReset] = useState(false);

  const simulatedCount = state.meetings.filter(
    (m) => m.isSimulatedCapture || m.id.startsWith("mtg-sim-")
  ).length;

  // Custom Template Builder
  const [newTplName, setNewTplName] = useState("");
  const [newTplInstructions, setNewTplInstructions] = useState("");

  return (
    <div className="mx-auto max-w-5xl p-5 md:p-7 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Workspace Settings, AI Templates & Integrations
          </h1>
          <p className="text-xs text-gray-400">
            Configure your user profile, auto-recording rules, CRM sync connections, and persistence controls
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={cleanupSimulatedMeetings}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
            title="Safely remove simulated test records while preserving seeded meetings and your edits"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clean Up Simulated Calls ({simulatedCount})</span>
          </button>

          {!confirmFullReset ? (
            <button
              onClick={() => setConfirmFullReset(true)}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Full Factory Reset</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-500 bg-rose-950/60 px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-[11px] font-semibold text-rose-200">
                Wipe all custom edits?
              </span>
              <button
                onClick={async () => {
                  await resetDemoWorkspace();
                  setConfirmFullReset(false);
                }}
                className="rounded bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-rose-500"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setConfirmFullReset(false)}
                className="rounded px-1.5 py-0.5 text-[11px] text-gray-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Persistence Architecture Disclosure Card */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 flex items-start gap-3">
        <Database className="h-5 w-5 text-[#00D4B2] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-white">
            Hybrid Persistence Architecture (Server JSON API + Client LocalStorage)
          </p>
          <p className="text-gray-300 leading-relaxed">
            All changes you make—switching AI templates, editing transcript lines, completing action items, or creating new highlight clips—are persisted both to your browser’s <code className="font-mono text-indigo-300">localStorage</code> and synced via <code className="font-mono text-indigo-300">PUT /api/workspace</code>. Note: on serverless platforms with ephemeral filesystems, per-evaluator browser storage guarantees your custom edits persist across reloads without colliding with other visitors.
          </p>
        </div>
      </div>

      {/* Profile & Workspace Context */}
      <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1E2330] pb-3">
          <User className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white">Profile & Workspace Identity</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-400">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-400">
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-400">
              Role / Title
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-400">
              Workspace Organization
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => updateUserProfile({ name, email, role, workspaceName })}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Save Profile Changes
          </button>
        </div>
      </div>

      {/* Recording & AI Summary Preferences */}
      <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1E2330] pb-3">
          <Sliders className="h-4 w-4 text-[#00D4B2]" />
          <h2 className="text-sm font-bold text-white">
            Notetaker Auto-Join & Default AI Summary Rules
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl border border-[#22283A] bg-[#0D1017] p-3.5 cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-white">
                Auto-Record External Customer Calls
              </p>
              <p className="text-[11px] text-gray-400">
                Join calendar events with at least one external domain guest
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.user.preferences.autoRecordExternal}
              onChange={(e) =>
                updateUserPreferences({ autoRecordExternal: e.target.checked })
              }
              className="h-4 w-4 accent-[#00D4B2]"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-[#22283A] bg-[#0D1017] p-3.5 cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-white">
                Auto-Record Internal Team Syncs
              </p>
              <p className="text-[11px] text-gray-400">
                Capture product reviews, standups, and internal 1-on-1s
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.user.preferences.autoRecordInternal}
              onChange={(e) =>
                updateUserPreferences({ autoRecordInternal: e.target.checked })
              }
              className="h-4 w-4 accent-[#00D4B2]"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-400">
              Default Summary Template Framework
            </label>
            <select
              value={state.user.preferences.defaultTemplateId}
              onChange={(e) =>
                updateUserPreferences({
                  defaultTemplateId: e.target.value as SummaryTemplateId,
                })
              }
              className="mt-1 w-full rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
            >
              {SUMMARY_TEMPLATES_META.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.badge})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-400">
              Slack Clip Notification Channel
            </label>
            <input
              type="text"
              value={state.user.preferences.slackChannel}
              onChange={(e) => updateUserPreferences({ slackChannel: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 font-mono text-xs text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase text-gray-400">
            Custom AI Prompt Instructions
          </label>
          <textarea
            rows={2}
            value={customAiPrompt}
            onChange={(e) => setCustomAiPrompt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#252B3D] bg-[#0D1017] p-3 text-xs text-white"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={() =>
                updateUserPreferences({ customAiInstructions: customAiPrompt })
              }
              className="rounded-lg bg-[#1A2030] border border-[#2A3248] px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-indigo-500"
            >
              Update AI Instructions
            </button>
          </div>
        </div>
      </div>

      {/* Custom Template Builder */}
      <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1E2330] pb-3">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white">Custom AI Template Builder</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="text"
            value={newTplName}
            onChange={(e) => setNewTplName(e.target.value)}
            placeholder="Template Name (e.g. Executive Deal Review)"
            className="rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
          />
          <input
            type="text"
            value={newTplInstructions}
            onChange={(e) => setNewTplInstructions(e.target.value)}
            placeholder="Custom prompt instructions (e.g. Extract competitor mentions)"
            className="rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
          />
          <button
            onClick={() => {
              if (!newTplName.trim()) return;
              addCustomTemplate(
                newTplName.trim(),
                newTplInstructions.trim() || "Extract key points and decisions",
                ["Executive Summary", "Competitor Mentions", "Next Steps"]
              );
              setNewTplName("");
              setNewTplInstructions("");
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Save Custom Template</span>
          </button>
        </div>

        {state.customTemplates.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {state.customTemplates.map((ct) => (
              <div
                key={ct.id}
                className="rounded-xl border border-[#23293A] bg-[#0D1017] p-3 text-xs"
              >
                <p className="font-bold text-white">{ct.name}</p>
                <p className="text-gray-400 mt-0.5">{ct.promptInstructions}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connected Calendar & CRM Integrations */}
      <div className="rounded-2xl border border-[#1E2330] bg-[#111520] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1E2330] pb-3">
          <Link2 className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">
            Calendar, CRM & Collaboration Integrations
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              {
                key: "googleCalendar",
                name: "Google Calendar",
                desc: "Auto-detect Zoom & Google Meet links",
              },
              {
                key: "outlookCalendar",
                name: "Microsoft Outlook 365",
                desc: "Sync Teams & Outlook calendar invites",
              },
              {
                key: "hubspot",
                name: "HubSpot CRM",
                desc: "Bi-directional MEDDPICC deal property & note sync",
              },
              {
                key: "slack",
                name: "Slack (#customer-voice)",
                desc: "Post highlight clips & call recaps automatically",
              },
              {
                key: "notion",
                name: "Notion Product Wiki",
                desc: "Export user research & sprint sync summaries",
              },
              {
                key: "salesforce",
                name: "Salesforce Enterprise",
                desc: "Log call activities & opportunity next steps",
              },
            ] as const
          ).map((item) => {
            const connected = state.user.integrations[item.key].connected;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-xl border border-[#22283A] bg-[#0D1017] p-3.5"
              >
                <div>
                  <p className="text-xs font-bold text-white">{item.name}</p>
                  <p className="text-[11px] text-gray-400">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggleIntegration(item.key)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    connected
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-[#1A2030] text-gray-300 border border-[#2A3147] hover:text-white"
                  }`}
                >
                  {connected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>{connected ? "Connected" : "Connect"}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
