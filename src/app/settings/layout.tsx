import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace Settings & Integrations — Fathom AI",
  description:
    "Configure recording preferences, summary template defaults, calendar connections, and CRM integrations.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
