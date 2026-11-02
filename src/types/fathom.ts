export type SummaryTemplateId =
  | "general"
  | "meddpicc"
  | "customer_success"
  | "one_on_one"
  | "user_research"
  | "sprint_sync";

export type MeetingCategory =
  | "sales_discovery"
  | "customer_qbr"
  | "product_feedback"
  | "engineering_sync"
  | "executive_1on1"
  | "onboarding_kickoff";

export type MeetingPlatform = "zoom" | "google_meet" | "teams";

export type HighlightTag =
  | "Key Insight"
  | "Customer Pain"
  | "Pricing Objection"
  | "Feature Request"
  | "Decision"
  | "Positive Feedback";

export interface Participant {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  isExternal: boolean;
  avatarColor: string;
  initials: string;
  talkTimeSeconds: number;
  talkTimePercentage: number;
  questionsAsked: number;
}

export interface TranscriptSegment {
  id: string;
  meetingId: string;
  speakerId: string;
  speakerName: string;
  speakerRole: string;
  speakerColor: string;
  isExternal: boolean;
  startTime: number; // seconds from start of media
  endTime: number;
  text: string;
  isEdited?: boolean;
  highlightId?: string;
}

export interface MeetingChapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  summary: string;
}

export interface SummarySectionItem {
  id: string;
  text: string;
  timestampSeconds?: number;
  speakerName?: string;
  badge?: string;
}

export interface SummarySection {
  id: string;
  title: string;
  items: SummarySectionItem[];
}

export interface KeyDecision {
  id: string;
  decision: string;
  timestampSeconds: number;
  ownerName: string;
  impact: "high" | "medium";
}

export interface MeetingSummary {
  templateId: SummaryTemplateId;
  templateName: string;
  templateBadge: string;
  tldr: string;
  sections: SummarySection[];
  keyDecisions: KeyDecision[];
  followUpEmailDraft: {
    subject: string;
    body: string;
  };
}

export interface ActionItem {
  id: string;
  meetingId: string;
  meetingTitle: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  assigneeCompany: string;
  dueDate: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  timestampSeconds: number;
  syncedTo: ("hubspot" | "notion" | "slack" | "linear")[];
}

export interface HighlightClip {
  id: string;
  meetingId: string;
  meetingTitle: string;
  title: string;
  tag: HighlightTag;
  startTime: number;
  endTime: number;
  createdBy: string;
  createdAt: string;
  notes?: string;
  shareToken: string;
  viewCount: number;
  transcriptExcerpt: string;
  speakerName: string;
}

export interface Meeting {
  id: string;
  title: string;
  subtitle: string;
  category: MeetingCategory;
  platform: MeetingPlatform;
  status: "completed" | "upcoming" | "live_recording";
  scope: "my_calls" | "team_calls";
  visibility: "private" | "team" | "public_link";
  shareToken: string;
  scheduledAt: string;
  startedAt: string;
  durationSeconds: number;
  hostId: string;
  hostName: string;
  accountName?: string;
  dealValue?: string;
  dealStage?: string;
  mediaUrl: string; // Real playable audio/video file URL
  mediaType: "audio" | "video";
  isSimulatedCapture?: boolean;
  participants: Participant[];
  activeTemplateId: SummaryTemplateId;
  summariesByTemplate: Record<SummaryTemplateId, MeetingSummary>;
  transcript: TranscriptSegment[];
  chapters: MeetingChapter[];
  actionItems: ActionItem[];
  highlights: HighlightClip[];
  metrics: {
    questionsAsked: number;
    longestMonologueSeconds: number;
    sentimentScore: "positive" | "neutral" | "cautious";
    engagementScore: number;
  };
}

export interface UpcomingCalendarEvent {
  id: string;
  title: string;
  platform: MeetingPlatform;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  accountName?: string;
  autoRecordEnabled: boolean;
  botStatus: "ready_to_join" | "paused" | "joining_soon";
  templateId: SummaryTemplateId;
  participants: {
    name: string;
    email: string;
    company: string;
    isExternal: boolean;
    initials: string;
    avatarColor: string;
  }[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: "Product & Engineering" | "Enterprise Sales" | "Customer Success" | "Leadership";
  workspaceName: string;
  workspaceDomain: string;
  avatarInitials: string;
  onboardingCompleted: boolean;
  isDemoMode: boolean;
  preferences: {
    autoRecordExternal: boolean;
    autoRecordInternal: boolean;
    defaultTemplateId: SummaryTemplateId;
    autoSendRecapEmail: boolean;
    crmAutoSync: boolean;
    slackChannel: string;
    customAiInstructions: string;
  };
  integrations: {
    googleCalendar: { connected: boolean; email: string; lastSynced: string };
    outlookCalendar: { connected: boolean; email: string };
    slack: { connected: boolean; workspace: string; channel: string };
    hubspot: { connected: boolean; portalId: string; dealsSynced: number };
    salesforce: { connected: boolean; orgName: string };
    notion: { connected: boolean; workspace: string; database: string };
  };
}

export interface ActivityEvent {
  id: string;
  type: "summary_generated" | "clip_shared" | "crm_synced" | "action_completed" | "calendar_joined";
  title: string;
  description: string;
  timestamp: string;
  meetingId?: string;
  actorName: string;
}

export interface WorkspaceState {
  user: UserProfile;
  meetings: Meeting[];
  upcomingEvents: UpcomingCalendarEvent[];
  activities: ActivityEvent[];
  customTemplates: {
    id: string;
    name: string;
    promptInstructions: string;
    sections: string[];
  }[];
}
