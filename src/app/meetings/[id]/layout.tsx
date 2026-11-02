import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meeting Studio & Synchronized Transcript — Fathom AI",
  description:
    "Review synchronized call playback, switch structured summary template views, manage action items, and create highlight clips.",
};

export default function MeetingDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
