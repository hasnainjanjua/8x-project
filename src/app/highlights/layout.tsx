import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Highlights & Shareable Clips — Fathom AI",
  description:
    "Curated audio highlights of key customer moments, product feedback, and decisions ready to share via public links.",
};

export default function HighlightsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
