import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recordings & Call Library — Fathom AI",
  description:
    "Browse and filter recorded customer and team meetings with speaker talk-time analytics and structured summaries.",
};

export default function MeetingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
