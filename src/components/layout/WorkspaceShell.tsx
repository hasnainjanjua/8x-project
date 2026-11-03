"use client";

import React from "react";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
