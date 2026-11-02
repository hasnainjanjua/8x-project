import fs from "fs";
import path from "path";
import os from "os";
import { INITIAL_WORKSPACE_STATE } from "@/data/seed-meetings";
import { WorkspaceState } from "@/types/fathom";

// Hybrid Server Persistence Layer:
// 1. In local development or writable Node runtimes, persists to `.data/workspace-db.json`
// 2. In serverless read-only environments (e.g. Vercel), persists to `os.tmpdir()/fathom-workspace-db.json`
//    plus in-memory singleton cache, paired with client-side LocalStorage synchronization.

declare global {
  // eslint-disable-next-line no-var
  var __FATHOM_WORKSPACE_MEM__: WorkspaceState | undefined;
}

function getDbFilePath(): string {
  const localDir = path.join(process.cwd(), ".data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return path.join(localDir, "workspace-db-v3.json");
  } catch {
    return path.join(os.tmpdir(), "fathom-workspace-db-v3.json");
  }
}

export function readServerWorkspace(): WorkspaceState {
  if (global.__FATHOM_WORKSPACE_MEM__) {
    return global.__FATHOM_WORKSPACE_MEM__;
  }

  const dbPath = getDbFilePath();
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, "utf-8");
      const parsed = JSON.parse(raw) as WorkspaceState;
      if (parsed && Array.isArray(parsed.meetings) && parsed.meetings.length > 0) {
        global.__FATHOM_WORKSPACE_MEM__ = parsed;
        return parsed;
      }
    }
  } catch {
    // Fallback to initial seed
  }

  const cloned = JSON.parse(JSON.stringify(INITIAL_WORKSPACE_STATE)) as WorkspaceState;
  global.__FATHOM_WORKSPACE_MEM__ = cloned;
  try {
    fs.writeFileSync(dbPath, JSON.stringify(cloned, null, 2), "utf-8");
  } catch {
    // Ignore write failure on strictly read-only fs
  }
  return cloned;
}

export function writeServerWorkspace(nextState: WorkspaceState): WorkspaceState {
  global.__FATHOM_WORKSPACE_MEM__ = nextState;
  const dbPath = getDbFilePath();
  try {
    fs.writeFileSync(dbPath, JSON.stringify(nextState, null, 2), "utf-8");
  } catch {
    // Ignore if read-only
  }
  return nextState;
}

export function resetServerWorkspace(): WorkspaceState {
  const fresh = JSON.parse(JSON.stringify(INITIAL_WORKSPACE_STATE)) as WorkspaceState;
  return writeServerWorkspace(fresh);
}
