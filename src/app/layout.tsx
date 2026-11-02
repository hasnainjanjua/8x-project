import type { Metadata } from "next";
import "./globals.css";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Fathom AI — Meeting Intelligence, Synchronized Transcripts & Clips",
  description:
    "Record, transcribe, summarize, and share key moments from your customer and team calls with Fathom AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090B10] text-gray-100 antialiased">
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
