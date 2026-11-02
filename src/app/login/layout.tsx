import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In & Workspace Onboarding — Fathom AI",
  description:
    "Sign in to Fathom AI, configure calendar auto-join rules, or explore the interactive demo workspace.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
