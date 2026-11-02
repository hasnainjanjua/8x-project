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

const STORAGE_KEY = "fathom_ai_workspace_v1";

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
  ) => HighlightClip;
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
  deleteActionItem: (actionItemId: string) => void;
  // Simulated Live Recording / Bot Capture
  addSimulatedMeeting: (meeting: Meeting) => void;
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

  // Hydrate from LocalStorage first for instant client state, then sync with Server API
  useEffect(() => {
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
      showToast(`Switched AI Summary template to ${templateId.replace("_", " ").toUpperCase()}`);
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
    (
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
    ): HighlightClip => {
      const targetMeeting = state.meetings.find((m) => m.id === meetingId);
      const newClip: HighlightClip = {
        id: `clip-${Date.now()}`,
        meetingId,
        meetingTitle: targetMeeting?.title || "Recorded Meeting",
        title: payload.title,
        tag: payload.tag,
        startTime: payload.startTime,
        endTime: payload.endTime,
        createdBy: state.user.name,
        createdAt: new Date().toISOString(),
        notes: payload.notes,
        shareToken: `clip-${Math.random().toString(36).substring(2, 9)}`,
        viewCount: 1,
        transcriptExcerpt: payload.transcriptExcerpt,
        speakerName: payload.speakerName,
      };

      persistState((prev) => ({
        ...prev,
        meetings: prev.meetings.map((m) =>
          m.id === meetingId
            ? {
                ...m,
                highlights: [newClip, ...m.highlights],
                transcript: m.transcript.map((seg) =>
                  seg.startTime >= payload.startTime && seg.startTime <= payload.endTime
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
      deleteActionItem,
      addSimulatedMeeting,
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
      deleteActionItem,
      addSimulatedMeeting,
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
