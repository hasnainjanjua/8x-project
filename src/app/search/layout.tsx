import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cross-Meeting Search — Fathom AI",
  description:
    "Search across meeting titles, participants, structured summaries, action items, and verbatim transcripts.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
