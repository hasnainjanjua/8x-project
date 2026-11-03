"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { INITIAL_WORKSPACE_STATE } from "@/data/seed-meetings";
import {
  ActionItem,
  HighlightClip,
  HighlightTag,
  Meeting,
  SummaryTemplateId,
  UserProfile,
  WorkspaceState,
} from "@/types/fathom";

const STORAGE_KEY = "fathom_ai_workspace_v3";

interface WorkspaceContextValue {
  state: WorkspaceState;
  isHydrated: boolean;
  activeSearchModalOpen: boolean;
  setActiveSearchModalOpen: (open: boolean) => void;
  liveRecorderModalOpen: boolean;
  setLiveRecorderModalOpen: (open: boolean) => void;
  onboardingModalOpen: boolean;
  setOnboardingModalOpen: (open: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  // Meeting & Summary actions
  switchMeetingTemplate: (meetingId: string, templateId: SummaryTemplateId) => void;
  updateTranscriptSegmentText: (meetingId: string, segmentId: string, newText: string) => void;
  createHighlightClip: (
    meetingId: string,
    payload: {
      title: string;
      tag: HighlightTag;
      startTime: number;
      endTime: number;
      transcriptExcerpt: string;
      speakerName: string;
      notes?: string;
    }
  ) => Promise<HighlightClip | null>;
  deleteHighlightClip: (meetingId: string, clipId: string) => void;
  // Action Items
  toggleActionItem: (actionItemId: string) => void;
  addActionItem: (
    meetingId: string,
    payload: {
      title: string;
      assigneeName: string;
      dueDate: string;
      priority: "high" | "medium" | "low";
      timestampSeconds?: number;
    }
  ) => void;
  updateActionItem: (
    actionItemId: string,
    payload: {
      title?: string;
      assigneeName?: string;
      dueDate?: string;
      priority?: "high" | "medium" | "low";
    }
  ) => void;
  deleteActionItem: (actionItemId: string) => void;
  // Simulated Live Recording / Bot Capture & Safe Cleanup
  addSimulatedMeeting: (meeting: Meeting) => void;
  deleteSimulatedMeeting: (meetingId: string) => void;
  cleanupSimulatedMeetings: () => void;
  toggleUpcomingAutoRecord: (eventId: string) => void;
  // User & Onboarding
  updateUserProfile: (partial: Partial<UserProfile>) => void;
  updateUserPreferences: (partial: Partial<UserProfile["preferences"]>) => void;
  toggleIntegration: (key: keyof UserProfile["integrations"]) => void;
  addCustomTemplate: (name: string, promptInstructions: string, sections: string[]) => void;
  resetDemoWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(INITIAL_WORKSPACE_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeSearchModalOpen, setActiveSearchModalOpen] = useState(false);
  const [liveRecorderModalOpen, setLiveRecorderModalOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  // Hydrate from LocalStorage first for instant client state, then sync with Server API.
  // Never hydrate or fetch full workspace state on public `/share/*` routes.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/share")) {
      setIsHydrated(true);
      return;
    }

    let loadedLocal = false;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WorkspaceState;
        if (parsed && Array.isArray(parsed.meetings) && parsed.meetings.length > 0) {
          setState(parsed);
          loadedLocal = true;
        }
      }
    } catch {
      // ignore local storage error
    }

    fetch("/api/workspace")
      .then((r) => r.json())
      .then((data) => {
        if (!loadedLocal && data?.ok && data?.state?.meetings?.length) {
          setState(data.state);
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data.state));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsHydrated(true);
      });
  }, []);

  // Global keyboard shortcut Cmd/Ctrl + K for Deep Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActiveSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const persistState = useCallback((updater: (prev: WorkspaceState) => WorkspaceState) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next }),
      }).catch(() => {});
      return next;
    });
  }, []);

  const switchMeetingTemplate = useCallback(
    (meetingId: string, templateId: SummaryTemplateId) => {
      persistState((prev) => ({
        ...prev,
        meetings: prev.meetings.map((m) =>
          m.id === meetingId ? { ...m, activeTemplateId: templateId } : m
        ),
      }));
      showToast(`Switched summary view to ${templateId.replace("_", " ").toUpperCase()}`);
    },
    [persistState, showToast]
  );

  const updateTranscriptSegmentText = useCallback(
    (meetingId: string, segmentId: string, newText: string) => {
      persistState((prev) => ({
        ...prev,
        meetings: prev.meetings.map((m) =>
          m.id === meetingId
            ? {
                ...m,
                transcript: m.transcript.map((seg) =>
                  seg.id === segmentId ? { ...seg, text: newText, isEdited: true } : seg
                ),
              }
            : m
        ),
      }));
      showToast("Transcript utterance updated");
    },
    [persistState, showToast]
  );

  const createHighlightClip = useCallback(
    async (
      meetingId: string,
      payload: {
        title: string;
        tag: HighlightTag;
        startTime: number;
        endTime: number;
        transcriptExcerpt: string;
        speakerName: string;
        notes?: string;
      }
    ): Promise<HighlightClip | null> => {
      const targetMeeting = state.meetings.find((m) => m.id === meetingId);
      const maxDur = targetMeeting ? targetMeeting.durationSeconds : 100;
      const startSec = Math.max(0, Math.min(maxDur - 1, Math.floor(Number(payload.startTime) || 0)));
      const endSec = Math.max(
        startSec + 1,
        Math.min(maxDur, Math.floor(Number(payload.endTime) || startSec + 15))
      );

      // Compute overlapping segments so speakerName and transcriptExcerpt always match [startSec, endSec]
      const overlapping = targetMeeting
        ? targetMeeting.transcript.filter(
            (seg) => seg.endTime > startSec && seg.startTime < endSec
          )
        : [];
      const resolvedSpeaker =
        overlapping.length > 0 ? overlapping[0].speakerName : payload.speakerName;
      const resolvedExcerpt =
        overlapping.length > 0
          ? overlapping.map((s) => s.text).join(" ").slice(0, 320)
          : payload.transcriptExcerpt.slice(0, 320);

      const signTargetMeetingId = meetingId.startsWith("mtg-sim-")
        ? "mtg-cloudnova-sim"
        : meetingId;

      try {
        const res = await fetch("/api/share-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: signTargetMeetingId,
            title: payload.title,
            tag: payload.tag,
            startTime: startSec,
            endTime: endSec,
            speakerName: resolvedSpeaker,
            transcriptExcerpt: resolvedExcerpt,
            createdBy: state.user.name,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok || typeof data.token !== "string") {
          showToast(data?.error || "Unable to generate portable signed share link");
          return null;
        }

        const clipId = `clip-${Date.now()}`;
        const newClip: HighlightClip = {
          id: clipId,
          meetingId,
          meetingTitle: targetMeeting?.title || "Recorded Meeting",
          title: payload.title,
          tag: payload.tag,
          startTime: startSec,
          endTime: endSec,
          createdBy: state.user.name,
          createdAt: new Date().toISOString(),
          notes: payload.notes,
          shareToken: data.token,
          viewCount: 1,
          transcriptExcerpt: resolvedExcerpt,
          speakerName: resolvedSpeaker,
        };

        persistState((prev) => ({
          ...prev,
          meetings: prev.meetings.map((m) =>
            m.id === meetingId
              ? {
                  ...m,
                  highlights: [newClip, ...m.highlights],
                  transcript: m.transcript.map((seg) =>
                    seg.endTime > startSec && seg.startTime < endSec
                      ? { ...seg, highlightId: newClip.id }
                      : seg
                  ),
                }
              : m
          ),
          activities: [
            {
              id: `actv-${Date.now()}`,
              type: "clip_shared",
              title: `Created highlight clip: "${payload.title}"`,
              description: `${targetMeeting?.title || "Meeting"} • Tagged as ${payload.tag}`,
              timestamp: "Just now",
              meetingId,
              actorName: prev.user.name,
            },
            ...prev.activities,
          ],
        }));

        showToast(`Highlight clip "${payload.title}" created & ready to share`);
        return newClip;
      } catch {
        showToast("Unable to sign portable clip link — please check your connection");
        return null;
      }
    },
    [persistState, showToast, state.meetings, state.user.name]
  );

  const deleteHighlightClip = useCallback(
    (meetingId: string, clipId: string) => {
      persistState((prev) => ({
        ...prev,
        meetings: prev.meetings.map((m) =>
          m.id === meetingId
            ? {
                ...m,
                highlights: m.highlights.filter((h) => h.id !== clipId),
                transcript: m.transcript.map((seg) =>
                  seg.highlightId === clipId ? { ...seg, highlightId: undefined } : seg
                ),
              }
            : m
        ),
      }));
      showToast("Highlight clip removed");
    },
    [persistState, showToast]
  );

  const toggleActionItem = useCallback(
    (actionItemId: string) => {
      persistState((prev) => ({
        ...prev,
        meetings: prev.meetings.map((m) => ({
          ...m,
          actionItems: m.actionItems.map((item) =>
            item.id === actionItemId ? { ...item, completed: !item.completed } : item
          ),
        })),
      }));
      showToast("Action item status updated");
    },
    [persistState, showToast]
  );

  const addActionItem = useCallback(
    (
      meetingId: string,
      payload: {
        title: string;
        assigneeName: string;
        dueDate: string;
        priority: "high" | "medium" | "low";
        timestampSeconds?: number;
      }
    ) => {
      const targetMeeting = state.meetings.find((m) => m.id === meetingId);
      const newItem: ActionItem = {
        id: `act-${Date.now()}`,
        meetingId,
        meetingTitle: targetMeeting?.title || "Meeting",
        title: payload.title,
        assigneeId: `spk-${Date.now()}`,
        assigneeName: payload.assigneeName,
        assigneeEmail: `${payload.assigneeName.toLowerCase().replace(/\s+/g, ".")}@fathom.video`,
        assigneeCompany: state.user.workspaceName,
        dueDate: payload.dueDate || "Friday",
        completed: false,
        priority: payload.priority,
        timestampSeconds: payload.timestampSeconds ?? 15,
        syncedTo: ["slack"],
      };

      persistState((prev) => ({
        ...prev,
        meetings: prev.meetings.map((m) =>
          m.id === meetingId ? { ...m, actionItems: [newItem, ...m.actionItems] } : m
        ),
      }));
      showToast(`Added action item for ${payload.assigneeName}`);
    },
    [persistState, showToast, state.meetings, state.user.workspaceName]
  );

  const updateActionItem = useCallback(
    (
      actionItemId: string,
      payload: {
        title?: string;
        assigneeName?: string;
        dueDate?: string;
        priority?: "high" | "medium" | "low";
      }
    ) => {
      persistState((prev) => ({
        ...prev,
        meetings: prev.meetings.map((m) => ({
          ...m,
          actionItems: m.actionItems.map((item) =>
            item.id === actionItemId
              ? {
                  ...item,
                  title: payload.title !== undefined ? payload.title : item.title,
                  assigneeName:
                    payload.assigneeName !== undefined ? payload.assigneeName : item.assigneeName,
                  dueDate: payload.dueDate !== undefined ? payload.dueDate : item.dueDate,
                  priority: payload.priority !== undefined ? payload.priority : item.priority,
                }
              : item
          ),
        })),
      }));
      showToast("Action item updated");
    },
    [persistState, showToast]
  );

  const deleteActionItem = useCallback(
    (actionItemId: string) => {
      persistState((prev) => ({
        ...prev,
        meetings: prev.meetings.map((m) => ({
          ...m,
          actionItems: m.actionItems.filter((a) => a.id !== actionItemId),
        })),
      }));
      showToast("Action item deleted");
    },
    [persistState, showToast]
  );

  const addSimulatedMeeting = useCallback(
    (meeting: Meeting) => {
      persistState((prev) => ({
        ...prev,
        meetings: [meeting, ...prev.meetings],
        activities: [
          {
            id: `actv-${Date.now()}`,
            type: "summary_generated",
            title: `Simulated Capture Processed: ${meeting.title}`,
            description: `Generated AI Summary, ${meeting.actionItems.length} action items, and ${meeting.highlights.length} highlights`,
            timestamp: "Just now",
            meetingId: meeting.id,
            actorName: "Fathom Simulated Notetaker",
          },
          ...prev.activities,
        ],
      }));
      showToast(`Meeting "${meeting.title}" processed & added to library`);
    },
    [persistState, showToast]
  );

  const deleteSimulatedMeeting = useCallback(
    (meetingId: string) => {
      persistState((prev) => ({
        ...prev,
        meetings: prev.meetings.filter(
          (m) => !(m.id === meetingId && (m.isSimulatedCapture || m.id.startsWith("mtg-sim-")))
        ),
        activities: prev.activities.filter((a) => a.meetingId !== meetingId),
      }));
      showToast("Simulated meeting removed while preserving seeded workspace");
    },
    [persistState, showToast]
  );

  const cleanupSimulatedMeetings = useCallback(() => {
    persistState((prev) => ({
      ...prev,
      meetings: prev.meetings.filter(
        (m) => !m.isSimulatedCapture && !m.id.startsWith("mtg-sim-")
      ),
      activities: prev.activities.filter(
        (a) => !a.meetingId || !a.meetingId.startsWith("mtg-sim-")
      ),
    }));
    showToast("Removed all simulated test calls (seeded meetings & custom edits preserved)");
  }, [persistState, showToast]);

  const toggleUpcomingAutoRecord = useCallback(
    (eventId: string) => {
      persistState((prev) => ({
        ...prev,
        upcomingEvents: prev.upcomingEvents.map((ev) =>
          ev.id === eventId
            ? {
                ...ev,
                autoRecordEnabled: !ev.autoRecordEnabled,
                botStatus: !ev.autoRecordEnabled ? "ready_to_join" : "paused",
              }
            : ev
        ),
      }));
      showToast("Updated Fathom Notetaker auto-join rule for scheduled meeting");
    },
    [persistState, showToast]
  );

  const updateUserProfile = useCallback(
    (partial: Partial<UserProfile>) => {
      persistState((prev) => ({
        ...prev,
        user: { ...prev.user, ...partial },
      }));
      showToast("Workspace profile saved");
    },
    [persistState, showToast]
  );

  const updateUserPreferences = useCallback(
    (partial: Partial<UserProfile["preferences"]>) => {
      persistState((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          preferences: { ...prev.user.preferences, ...partial },
        },
      }));
      showToast("Recording & AI summary preferences updated");
    },
    [persistState, showToast]
  );

  const toggleIntegration = useCallback(
    (key: keyof UserProfile["integrations"]) => {
      persistState((prev) => {
        const current = prev.user.integrations[key];
        const nextConnected = !current.connected;
        return {
          ...prev,
          user: {
            ...prev.user,
            integrations: {
              ...prev.user.integrations,
              [key]: {
                ...current,
                connected: nextConnected,
              },
            },
          },
        };
      });
      showToast("Integration connection updated");
    },
    [persistState, showToast]
  );

  const addCustomTemplate = useCallback(
    (name: string, promptInstructions: string, sections: string[]) => {
      persistState((prev) => ({
        ...prev,
        customTemplates: [
          ...prev.customTemplates,
          { id: `custom-${Date.now()}`, name, promptInstructions, sections },
        ],
      }));
      showToast(`Custom template "${name}" saved`);
    },
    [persistState, showToast]
  );

  const resetDemoWorkspace = useCallback(async () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const res = await fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    const data = await res.json();
    if (data?.state) {
      setState(data.state);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data.state));
      } catch {
        // ignore
      }
    } else {
      setState(INITIAL_WORKSPACE_STATE);
    }
    showToast("Demo workspace restored to initial seed data");
  }, [showToast]);

  const value = useMemo(
    () => ({
      state,
      isHydrated,
      activeSearchModalOpen,
      setActiveSearchModalOpen,
      liveRecorderModalOpen,
      setLiveRecorderModalOpen,
      onboardingModalOpen,
      setOnboardingModalOpen,
      toastMessage,
      showToast,
      switchMeetingTemplate,
      updateTranscriptSegmentText,
      createHighlightClip,
      deleteHighlightClip,
      toggleActionItem,
      addActionItem,
      updateActionItem,
      deleteActionItem,
      addSimulatedMeeting,
      deleteSimulatedMeeting,
      cleanupSimulatedMeetings,
      toggleUpcomingAutoRecord,
      updateUserProfile,
      updateUserPreferences,
      toggleIntegration,
      addCustomTemplate,
      resetDemoWorkspace,
    }),
    [
      state,
      isHydrated,
      activeSearchModalOpen,
      liveRecorderModalOpen,
      onboardingModalOpen,
      toastMessage,
      showToast,
      switchMeetingTemplate,
      updateTranscriptSegmentText,
      createHighlightClip,
      deleteHighlightClip,
      toggleActionItem,
      addActionItem,
      updateActionItem,
      deleteActionItem,
      addSimulatedMeeting,
      deleteSimulatedMeeting,
      cleanupSimulatedMeetings,
      toggleUpcomingAutoRecord,
      updateUserProfile,
      updateUserPreferences,
      toggleIntegration,
      addCustomTemplate,
      resetDemoWorkspace,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return ctx;
}
