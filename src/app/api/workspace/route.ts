import { NextRequest, NextResponse } from "next/server";
import {
  readServerWorkspace,
  resetServerWorkspace,
  writeServerWorkspace,
} from "@/lib/server-db";
import { WorkspaceState } from "@/types/fathom";

export async function GET() {
  const state = readServerWorkspace();
  return NextResponse.json({
    ok: true,
    persistenceMode: "hybrid-server-json-and-client-storage",
    state,
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.action === "reset") {
      const resetState = resetServerWorkspace();
      return NextResponse.json({ ok: true, state: resetState });
    }
    if (body?.state && Array.isArray(body.state.meetings)) {
      const saved = writeServerWorkspace(body.state as WorkspaceState);
      return NextResponse.json({ ok: true, state: saved });
    }
    return NextResponse.json({ ok: false, error: "Invalid state payload" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to save state" },
      { status: 500 }
    );
  }
}
