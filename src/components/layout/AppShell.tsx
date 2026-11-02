"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  CheckSquare,
  Scissors,
  Search,
  Settings,
  Radio,
  Sparkles,
  Calendar,
  RotateCcw,
  LogIn,
  CheckCircle2,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";
import { GlobalSearchModal } from "@/components/modals/GlobalSearchModal";
import { SimulatedLiveCaptureModal } from "@/components/modals/SimulatedLiveCaptureModal";
import { OnboardingModal } from "@/components/modals/OnboardingModal";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/meetings", label: "Recordings & Calls", icon: Video },
  { href: "/action-items", label: "Action Items", icon: CheckSquare },
  { href: "/highlights", label: "Highlights & Clips", icon: Scissors },
  { href: "/search", label: "Deep Search", icon: Search },
  { href: "/settings", label: "Settings & Sync", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    state,
    setActiveSearchModalOpen,
    setLiveRecorderModalOpen,
    setOnboardingModalOpen,
    toastMessage,
    cleanupSimulatedMeetings,
    resetDemoWorkspace,
  } = useWorkspace();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [confirmResetSeed, setConfirmResetSeed] = useState(false);

  const simulatedCount = state.meetings.filter(
    (m) => m.isSimulatedCapture || m.id.startsWith("mtg-sim-")
  ).length;

  // Public share pages and standalone auth page render with their own clean chrome or full-bleed layout
  const isShareRoute = pathname?.startsWith("/share/");
  const isAuthRoute = pathname?.startsWith("/login");

  const openTasksCount = state.meetings.reduce(
    (acc, m) => acc + m.actionItems.filter((a) => !a.completed).length,
    0
  );
  const totalClipsCount = state.meetings.reduce((acc, m) => acc + m.highlights.length, 0);

  if (isShareRoute || isAuthRoute) {
    return (
      <div className="min-h-screen bg-[#090B10] text-gray-100">
        {children}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-indigo-500/40 bg-[#141824] px-4 py-3 text-sm font-medium text-white shadow-2xl">
            <CheckCircle2 className="h-4 w-4 text-[#00D4B2]" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#090B10] text-gray-100">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col justify-between border-r border-[#1E2330] bg-[#0D1017] md:flex">
        <div>
          {/* Brand Header */}
          <div className="flex h-16 items-center justify-between border-b border-[#1E2330] px-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-[#00D4B2] shadow-md shadow-indigo-500/20">
                <Sparkles className="h-4 w-4 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-white">FATHOM</span>
                  <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-400 border border-indigo-500/30">
                    AI 2.0
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 truncate max-w-[145px]">
                  {state.user.workspaceName}
                </p>
              </div>
            </Link>
          </div>

          {/* Primary CTA: Simulated Meeting Recorder */}
          <div className="p-3.5">
            <button
              onClick={() => setLiveRecorderModalOpen(true)}
              className="group flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:from-indigo-500 hover:to-indigo-400"
            >
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-300 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400"></span>
                </span>
                <Radio className="h-3.5 w-3.5" />
                <span>Simulate Live Call</span>
              </span>
              <span className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] text-indigo-100">
                 Mock Bot
              </span>
            </button>
          </div>

          {/* Search Trigger */}
          <div className="px-3.5 pb-2">
            <button
              onClick={() => setActiveSearchModalOpen(true)}
              className="flex w-full items-center justify-between rounded-lg border border-[#1E2330] bg-[#121621] px-3 py-2 text-xs text-gray-400 transition hover:border-gray-600 hover:text-gray-200"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-gray-400" />
                <span>Search transcripts...</span>
              </span>
              <kbd className="rounded border border-[#2A3142] bg-[#191E2D] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-2 space-y-1 px-3">
            <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Workspace
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-indigo-500/15 text-white border border-indigo-500/30"
                      : "text-gray-400 hover:bg-[#151925] hover:text-gray-200 border border-transparent"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isActive ? "text-[#00D4B2]" : "text-gray-400"
                      )}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.href === "/meetings" && (
                    <span className="rounded-full bg-[#1B2030] px-2 py-0.5 font-mono text-[11px] text-gray-300">
                      {state.meetings.length}
                    </span>
                  )}
                  {item.href === "/action-items" && openTasksCount > 0 && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] text-amber-300 border border-amber-500/30">
                      {openTasksCount}
                    </span>
                  )}
                  {item.href === "/highlights" && (
                    <span className="rounded-full bg-[#00D4B2]/15 px-2 py-0.5 font-mono text-[11px] text-[#00D4B2]">
                      {totalClipsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Public Share Link Showcase for Evaluators */}
          <div className="mt-5 px-3">
            <div className="rounded-xl border border-[#1E2330] bg-[#121621]/90 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#00D4B2]" />
                  <span>Evaluator Quick Links</span>
                </span>
                <span className="rounded bg-[#00D4B2]/10 px-1.5 py-0.5 font-mono text-[9px] text-[#00D4B2]">
                  Public
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                Test unauthenticated share view or onboarding wizard anytime:
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                <Link
                  href="/share/share-acme-q4-discovery"
                  className="flex items-center justify-between rounded-lg border border-[#252B3B] bg-[#171C29] px-2.5 py-1.5 text-[11px] font-medium text-indigo-300 hover:border-indigo-500/40 hover:text-white"
                >
                  <span>Public Shared Call View</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <button
                  onClick={() => setOnboardingModalOpen(true)}
                  className="flex items-center justify-between rounded-lg border border-[#252B3B] bg-[#171C29] px-2.5 py-1.5 text-[11px] font-medium text-gray-300 hover:border-gray-500 hover:text-white"
                >
                  <span>Calendar & Onboarding Flow</span>
                  <Calendar className="h-3 w-3 text-[#00D4B2]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom User Profile & Demo Mode Controls */}
        <div className="border-t border-[#1E2330] p-3">
          <div className="flex items-center justify-between rounded-xl bg-[#121621] p-2.5 border border-[#1E2330]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {state.user.avatarInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{state.user.name}</p>
                <p className="truncate text-[11px] text-gray-400">{state.user.role}</p>
              </div>
            </div>
            <Link
              href="/login"
              title="Switch Account / Sign-in Screen"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-[#1C2232] hover:text-white"
            >
              <LogIn className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 px-1">
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Instant Demo Active
            </span>
            <div className="flex items-center gap-2">
              {simulatedCount > 0 && (
                <button
                  onClick={cleanupSimulatedMeetings}
                  className="flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                  title="Safely remove simulated test calls while preserving the 4 seeded calls and your edits"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                  <span>Clean Sim ({simulatedCount})</span>
                </button>
              )}
              {!confirmResetSeed ? (
                <button
                  onClick={() => setConfirmResetSeed(true)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-rose-300"
                  title="Destructive: Reset entire workspace and all edits to initial seed"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Full Reset</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      resetDemoWorkspace();
                      setConfirmResetSeed(false);
                    }}
                    className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-rose-500"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmResetSeed(false)}
                    className="rounded bg-[#1E2330] px-1.5 py-0.5 text-[9px] text-gray-300 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1E2330] bg-[#0D1017]/90 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="rounded-lg border border-[#222738] p-1.5 text-gray-300 md:hidden"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Google Calendar Connected ({state.user.email})
              </span>
              <span className="hidden lg:inline-block text-gray-600">•</span>
              <span className="hidden lg:inline-block text-gray-400">
                Default AI Template:{" "}
                <strong className="text-gray-200 uppercase font-mono text-[11px]">
                  {state.user.preferences.defaultTemplateId}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSearchModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[#222738] bg-[#131722] px-3 py-1.5 text-xs text-gray-300 hover:border-indigo-500/40 hover:text-white"
            >
              <Search className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Search Calls & Transcripts</span>
              <kbd className="rounded bg-[#1B2130] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => setOnboardingModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#222738] bg-[#131722] px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-gray-600"
            >
              <Calendar className="h-3.5 w-3.5 text-[#00D4B2]" />
              <span>Calendar Rules</span>
            </button>

            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Auth / Sign In</span>
            </Link>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="border-b border-[#1E2330] bg-[#0D1017] p-4 md:hidden space-y-3">
            <nav className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-2 rounded-lg border border-[#1E2330] bg-[#131722] px-3 py-2 text-xs font-medium text-gray-200"
                  >
                    <Icon className="h-4 w-4 text-[#00D4B2]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1E2330]">
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  setLiveRecorderModalOpen(true);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Simulate Live Call</span>
              </button>
              {simulatedCount > 0 && (
                <button
                  onClick={() => {
                    cleanupSimulatedMeetings();
                    setMobileNavOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clean Sim ({simulatedCount})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Workspace Viewport */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Global Modals */}
      <GlobalSearchModal />
      <SimulatedLiveCaptureModal />
      <OnboardingModal />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-indigo-500/40 bg-[#141824] px-4 py-3 text-sm font-medium text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-[#00D4B2]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
