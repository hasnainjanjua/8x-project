import type { Metadata } from "next";
import "./globals.css";
import { AppRootShell } from "@/components/layout/AppRootShell";

export const metadata: Metadata = {
  title: "Dashboard — Fathom AI Meeting Intelligence",
  description:
    "Review recorded calls, upcoming calendar auto-join rules, open action items, and workspace activity in Fathom AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090B10] text-gray-100 antialiased">
        <AppRootShell>{children}</AppRootShell>
      </body>
    </html>
  );
}
