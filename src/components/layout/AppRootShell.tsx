"use client";

import React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const WorkspaceShell = dynamic(() => import("@/components/layout/WorkspaceShell"));

export function AppRootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicShareRoute = pathname?.startsWith("/share/") || pathname === "/share";

  if (isPublicShareRoute) {
    return <div className="min-h-screen bg-[#090B10] text-gray-100">{children}</div>;
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}
