"use client";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Sparkles,
  X,
  ArrowRight,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { SUMMARY_TEMPLATES_META } from "@/data/seed-meetings";
import { SummaryTemplateId } from "@/types/fathom";

export function OnboardingModal() {
  const {
    state,
    onboardingModalOpen,
    setOnboardingModalOpen,
    updateUserProfile,
    updateUserPreferences,
    toggleIntegration,
  } = useWorkspace();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState(state.user.role);
  const [workspaceName, setWorkspaceName] = useState(state.user.workspaceName);
  const [defaultTemplate, setDefaultTemplate] = useState<SummaryTemplateId>(
    state.user.preferences.defaultTemplateId
  );
  const [autoExternal, setAutoExternal] = useState(state.user.preferences.autoRecordExternal);
  const [autoInternal, setAutoInternal] = useState(state.user.preferences.autoRecordInternal);

  if (!onboardingModalOpen) return null;

  const handleComplete = () => {
    updateUserProfile({
      role,
      workspaceName,
      onboardingCompleted: true,
    });
    updateUserPreferences({
      defaultTemplateId: defaultTemplate,
      autoRecordExternal: autoExternal,
      autoRecordInternal: autoInternal,
    });
    setOnboardingModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#262C3E] bg-[#111520] shadow-2xl">
        {/* Top Progress Header */}
        <div className="flex items-center justify-between border-b border-[#1E2330] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30">
              <Sparkles className="h-4 w-4 text-[#00D4B2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Fathom Workspace & Calendar Setup
              </h2>
              <p className="text-xs text-gray-400">Step {step} of 3 • Onboarding & Auto-Join Rules</p>
            </div>
          </div>
          <button
            onClick={() => setOnboardingModalOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-[#1B2030] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-5 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  1. Connect Your Calendar for Automatic Meeting Detection
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  Fathom syncs with your calendar to detect Zoom, Google Meet, and Microsoft Teams links and join automatically.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between rounded-xl border border-[#23293A] bg-[#151A28] p-3.5">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-[#00D4B2]" />
                    <div>
                      <p className="text-xs font-semibold text-white">Google Calendar</p>
                      <p className="text-[11px] text-gray-400">
                        {state.user.integrations.googleCalendar.connected
                          ? `Connected as ${state.user.email}`
                          : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleIntegration("googleCalendar")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      state.user.integrations.googleCalendar.connected
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    {state.user.integrations.googleCalendar.connected
                      ? "Connected ✓"
                      : "Connect Google"}
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#23293A] bg-[#151A28] p-3.5">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                    <div>
                      <p className="text-xs font-semibold text-white">Microsoft Outlook 365</p>
                      <p className="text-[11px] text-gray-400">
                        {state.user.integrations.outlookCalendar.connected
                          ? "Synced with Microsoft Teams & Outlook"
                          : "Optional secondary calendar"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleIntegration("outlookCalendar")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      state.user.integrations.outlookCalendar.connected
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "border border-[#2D354B] bg-[#1A2030] text-gray-200 hover:border-gray-500"
                    }`}
                  >
                    {state.user.integrations.outlookCalendar.connected
                      ? "Connected ✓"
                      : "Connect Outlook"}
                  </button>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-[#1E2330] bg-[#0D1017] p-3.5">
                <p className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Auto-Record Meeting Rules</span>
                </p>
                <label className="flex items-center justify-between text-xs text-gray-300 cursor-pointer pt-1">
                  <span>Automatically record calls with external guests</span>
                  <input
                    type="checkbox"
                    checked={autoExternal}
                    onChange={(e) => setAutoExternal(e.target.checked)}
                    className="h-4 w-4 accent-indigo-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-gray-300 cursor-pointer pt-1">
                  <span>Automatically record internal team meetings</span>
                  <input
                    type="checkbox"
                    checked={autoInternal}
                    onChange={(e) => setAutoInternal(e.target.checked)}
                    className="h-4 w-4 accent-indigo-500 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  2. Choose Your Default AI Summary Framework
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  Fathom formats every call summary using your preferred template—and you can switch templates anytime after a call.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                {SUMMARY_TEMPLATES_META.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setDefaultTemplate(tpl.id)}
                    className={`flex items-start justify-between rounded-xl border p-3 text-left transition ${
                      defaultTemplate === tpl.id
                        ? "border-indigo-500 bg-indigo-500/15"
                        : "border-[#22283A] bg-[#141824] hover:border-gray-600"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{tpl.name}</span>
                        <span className="rounded bg-[#1E2436] px-1.5 py-0.5 font-mono text-[10px] text-indigo-300">
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400">{tpl.description}</p>
                    </div>
                    {defaultTemplate === tpl.id && (
                      <CheckCircle2 className="h-4 w-4 text-[#00D4B2] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  3. Workspace Role & CRM / Collaboration Sync
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  Personalize how Fathom attributes your action items and routes highlights.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Your Role / Title
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-200">
                  Your workspace is configured with SOC2 Type II privacy controls and bi-directional HubSpot + Slack sync.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#1E2330] bg-[#0D1017] px-5 py-3.5">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s as 1 | 2 | 3)}
                className={`h-2 w-6 rounded-full transition ${
                  step === s ? "bg-[#00D4B2]" : "bg-[#252B3D]"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                className="rounded-lg border border-[#262C3E] px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex items-center gap-1.5 rounded-xl bg-[#00D4B2] px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-[#00e6c2]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Save & Enter Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
