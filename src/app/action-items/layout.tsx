import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Action Items & Follow-Ups — Fathom AI",
  description:
    "Track, edit, complete, and filter meeting action items with owner attribution and timestamp jump links.",
};

export default function ActionItemsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
