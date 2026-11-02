"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Calendar,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function LoginPage() {
  const router = useRouter();
  const { state, updateUserProfile, setOnboardingModalOpen, showToast } = useWorkspace();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState(state.user.name);
  const [email, setEmail] = useState(state.user.email);
  const [workspaceName, setWorkspaceName] = useState(state.user.workspaceName);

  const handleEnterInstantDemo = () => {
    showToast("Entered Instant Demo Workspace as Hasnain Janjua");
    router.push("/");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    updateUserProfile({
      name: name.trim() || "Hasnain Janjua",
      email: email.trim() || "hasnain@fathom.video",
      workspaceName: workspaceName.trim() || "Fathom AI Enterprise",
      avatarInitials: initials || "HJ",
    });

    if (mode === "signup") {
      setOnboardingModalOpen(true);
    }
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090B10] p-4 text-gray-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#232A3D] bg-[#111520] p-6 shadow-2xl">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-[#00D4B2] shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-white">
            Fathom AI Meeting Intelligence
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            Record, transcribe, summarize, and share key moments from every call
          </p>
        </div>

        {/* Primary 1-Click Interactive Demo Workspace Access */}
        <div className="rounded-xl border border-[#00D4B2]/40 bg-[#00D4B2]/10 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#00D4B2] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>Interactive Demo Workspace</span>
            </span>
            <span className="rounded bg-[#00D4B2]/20 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00D4B2]">
              INSTANT ACCESS
            </span>
          </div>
          <p className="text-xs text-gray-200 leading-relaxed">
            Explore the pre-populated demonstration workspace with sample call recordings, synchronized transcripts, summary templates, and shareable highlight clips.
          </p>
          <button
            onClick={handleEnterInstantDemo}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00D4B2] py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:bg-[#00e6c2] transition"
          >
            <span>Enter Demo Workspace (No Login Required)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#1E2330]"></div>
          <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-gray-500">
            Or Sign In / Create Workspace
          </span>
          <div className="flex-grow border-t border-[#1E2330]"></div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#0D1017] p-1 border border-[#1E2330]">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === "signin" ? "bg-indigo-600 text-white" : "text-gray-400"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === "signup" ? "bg-indigo-600 text-white" : "text-gray-400"
            }`}
          >
            New User Onboarding
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-400">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#252B3D] bg-[#0D1017] px-3 py-2 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {mode === "signup"
                ? "Create Account & Launch Calendar Onboarding"
                : "Sign In with Google Workspace SSO"}
            </span>
          </button>
        </form>

        <div className="flex items-center justify-between border-t border-[#1E2330] pt-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            SOC2 Type II Certified
          </span>
          <Link href="/share/share-acme-q4-discovery" className="text-indigo-400 hover:underline">
            View Sample Public Share Link →
          </Link>
        </div>
      </div>
    </div>
  );
}
