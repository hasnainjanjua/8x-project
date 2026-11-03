import { INITIAL_MEETINGS, SUMMARY_TEMPLATES_META } from "@/data/seed-meetings";
import { readServerWorkspace } from "@/lib/server-db";
import { verifyPortableClipToken } from "@/lib/share-token";
import type { HighlightClip, HighlightTag, Meeting, TranscriptSegment } from "@/types/fathom";

export interface PublicClipTranscriptSegment {
  id: string;
  speakerName: string;
  speakerRole: string;
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Dedicated Clip-Only Public Response Model.
 * Strictly contains ONLY the clip title, authorized [startTime, endTime] bounds,
 * transcript segments overlapping [startTime, endTime], relevant speaker names,
 * and the boundary-enforced clip audio URL.
 *
 * Intentionally excludes all parent meeting fields (meetingId, meetingTitle,
 * subtitle, summariesByTemplate, full transcript, actionItems, other highlights,
 * hostName, scheduledAt, accountName, dealValue, parent duration, raw mediaUrl).
 */
export interface PublicClipShareView {
  kind: "clip";
  clipId: string;
  shareToken: string;
  title: string;
  tag: HighlightTag;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  speakerName: string;
  speakers: string[];
  transcriptExcerpt: string;
  mediaUrl: string;
  transcript: PublicClipTranscriptSegment[];
}

export interface PublicMeetingShareView {
  kind: "meeting";
  meetingId: string;
  shareToken: string;
  title: string;
  subtitle: string;
  scheduledAt: string;
  durationSeconds: number;
  hostName: string;
  mediaUrl: string;
  summary: {
    templateName: string;
    tldr: string;
    sections: {
      id: string;
      title: string;
      items: {
        id: string;
        text: string;
        timestampSeconds?: number;
      }[];
    }[];
  };
  actionItems: {
    id: string;
    title: string;
    assigneeName: string;
    completed: boolean;
  }[];
  transcript: PublicClipTranscriptSegment[];
}

export type PublicShareResolution = PublicClipShareView | PublicMeetingShareView | null;

export interface ResolvedShareAudioSource {
  kind: "clip" | "meeting";
  internalMediaPath: string;
  startTime: number;
  endTime: number;
  parentDurationSeconds: number;
}

const SIMULATED_CLOUDNOVA_SEGMENTS: TranscriptSegment[] = [
  {
    id: "sim-seg-0",
    meetingId: "mtg-cloudnova-sim",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 0,
    endTime: 25,
    text: "Welcome to our live technical evaluation session, Jordan. How is your engineering team at CloudNova currently handling post-call architecture notes and action item handoffs?",
  },
  {
    id: "sim-seg-1",
    meetingId: "mtg-cloudnova-sim",
    speakerId: "spk-prospect",
    speakerName: "Jordan Taylor",
    speakerRole: "VP of Engineering",
    speakerColor: "#00D4B2",
    isExternal: true,
    startTime: 25,
    endTime: 50,
    text: "Our primary requirement is capturing key architectural decisions and customer commitments without distracting engineers during high-stakes calls.",
  },
  {
    id: "sim-seg-2",
    meetingId: "mtg-cloudnova-sim",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 50,
    endTime: 75,
    text: "Anytime a stakeholder states a requirement or objection, you click a one-click highlight button in the Fathom bar and it timestamps the exact segment.",
  },
  {
    id: "sim-seg-3",
    meetingId: "mtg-cloudnova-sim",
    speakerId: "spk-prospect",
    speakerName: "Jordan Taylor",
    speakerRole: "VP of Engineering",
    speakerColor: "#00D4B2",
    isExternal: true,
    startTime: 75,
    endTime: 100,
    text: "That solves our sprint handoff bottleneck. Can we move forward with a 30-seat engineering trial starting Monday and sync action items to Linear?",
  },
];

const SIMULATED_CLOUDNOVA_MEETING: Meeting = {
  id: "mtg-cloudnova-sim",
  title: "CloudNova — Enterprise Architecture & 30-Seat Trial Kickoff",
  subtitle: "Simulated Live Call Capture • Paired with Sample Audio",
  category: "sales_discovery",
  platform: "zoom",
  status: "completed",
  scope: "my_calls",
  visibility: "public_link",
  shareToken: "share-cloudnova-sim",
  scheduledAt: "2026-11-02T18:00:00Z",
  startedAt: "2026-11-02T18:00:00Z",
  durationSeconds: 100,
  hostId: "usr-hasnain",
  hostName: "Hasnain Janjua",
  accountName: "CloudNova",
  dealValue: "$48,000 ARR",
  dealStage: "Trial Provisioning",
  mediaUrl: "/media/meeting-cloudnova-sim.wav",
  mediaType: "audio",
  isSimulatedCapture: true,
  activeTemplateId: "meddpicc",
  participants: [],
  transcript: SIMULATED_CLOUDNOVA_SEGMENTS,
  chapters: [],
  summariesByTemplate: SUMMARY_TEMPLATES_META.reduce((acc, tpl) => {
    acc[tpl.id] = {
      templateId: tpl.id,
      templateName: tpl.name,
      templateBadge: tpl.badge,
      tldr: "Simulated Live Capture for CloudNova: Validated real-time highlight bookmarking and agreed to launch a 30-seat CloudNova engineering trial starting Monday with Linear action item sync.",
      sections: [
        {
          id: "sim-s1",
          title: "Key Discussion Points & Requirements",
          items: [
            {
              id: "sim-i1",
              text: "CloudNova needs to capture architectural decisions and customer commitments without manual note-taking during calls.",
              timestampSeconds: 25,
              speakerName: "Jordan Taylor",
              badge: "Customer Pain",
            },
            {
              id: "sim-i2",
              text: "Demonstrated one-click live Highlight tagging synchronized with the call timeline.",
              timestampSeconds: 50,
              speakerName: "Hasnain Janjua",
            },
          ],
        },
      ],
      keyDecisions: [
        {
          id: "sim-d1",
          decision: "Launch 30-seat CloudNova engineering trial on Monday with automated Linear task sync.",
          timestampSeconds: 75,
          ownerName: "Jordan Taylor",
          impact: "high",
        },
      ],
      followUpEmailDraft: {
        subject: "Recap & Trial Next Steps: CloudNova",
        body: "Hi Jordan,\n\nGreat speaking today! As agreed, we are provisioning your 30-seat CloudNova trial for Monday and enabling Linear action-item sync.\n\nBest,\nHasnain",
      },
    };
    return acc;
  }, {} as Meeting["summariesByTemplate"]),
  actionItems: [],
  highlights: [],
  metrics: {
    questionsAsked: 2,
    longestMonologueSeconds: 25,
    sentimentScore: "positive",
    engagementScore: 91,
  },
};

function getAllCanonicalMeetings(): Meeting[] {
  try {
    const serverState = readServerWorkspace();
    if (serverState && Array.isArray(serverState.meetings) && serverState.meetings.length > 0) {
      // Merge server meetings with canonical defaults so existing seeded meetings retain fallback stability
      const map = new Map<string, Meeting>();
      for (const m of INITIAL_MEETINGS) map.set(m.id, m);
      map.set(SIMULATED_CLOUDNOVA_MEETING.id, SIMULATED_CLOUDNOVA_MEETING);
      for (const m of serverState.meetings) map.set(m.id, m);
      return Array.from(map.values());
    }
  } catch {
    // ignore server-db read errors and use static fallback
  }
  return [...INITIAL_MEETINGS, SIMULATED_CLOUDNOVA_MEETING];
}

function findCanonicalMeetingById(meetingId: string): Meeting | null {
  const all = getAllCanonicalMeetings();
  if (meetingId.startsWith("mtg-sim-")) {
    const matchedSim = all.find((m) => m.id === meetingId || m.id === "mtg-cloudnova-sim");
    return matchedSim || SIMULATED_CLOUDNOVA_MEETING;
  }
  return all.find((m) => m.id === meetingId) || null;
}

function buildPublicClipShareView(
  clip: HighlightClip,
  parentMeeting: Meeting,
  requestedToken: string
): PublicClipShareView {
  const S = Math.max(0, Math.min(parentMeeting.durationSeconds, Math.floor(clip.startTime)));
  const E = Math.max(S + 1, Math.min(parentMeeting.durationSeconds, Math.floor(clip.endTime)));

  // Strictly include ONLY transcript segments overlapping [S, E] (seg.endTime > S && seg.startTime < E)
  // and clamp segment boundaries to [S, E] so no parent-meeting timestamps outside [S, E] are exposed.
  const overlappingSegments: PublicClipTranscriptSegment[] = parentMeeting.transcript
    .filter((seg) => seg.endTime > S && seg.startTime < E)
    .map((seg) => ({
      id: seg.id,
      speakerName: seg.speakerName,
      speakerRole: seg.speakerRole,
      startTime: Math.max(S, seg.startTime),
      endTime: Math.min(E, seg.endTime),
      text: seg.text,
    }));

  const finalTranscript: PublicClipTranscriptSegment[] =
    overlappingSegments.length > 0
      ? overlappingSegments
      : [
          {
            id: `${clip.id}-seg`,
            speakerName: clip.speakerName,
            speakerRole: "Participant",
            startTime: S,
            endTime: E,
            text: clip.transcriptExcerpt,
          },
        ];

  const speakers = Array.from(
    new Set(
      finalTranscript
        .map((seg) => seg.speakerName)
        .concat(clip.speakerName ? [clip.speakerName] : [])
        .filter(Boolean)
    )
  );

  return {
    kind: "clip",
    clipId: clip.id,
    shareToken: requestedToken,
    title: clip.title,
    tag: clip.tag,
    startTime: S,
    endTime: E,
    durationSeconds: E - S,
    speakerName: clip.speakerName,
    speakers,
    transcriptExcerpt: clip.transcriptExcerpt,
    mediaUrl: `/api/share-media/${encodeURIComponent(requestedToken)}`,
    transcript: finalTranscript,
  };
}

function buildPublicMeetingShareView(
  meeting: Meeting,
  requestedToken: string
): PublicMeetingShareView {
  const activeSummary =
    meeting.summariesByTemplate[meeting.activeTemplateId] ||
    meeting.summariesByTemplate.general;

  return {
    kind: "meeting",
    meetingId: meeting.id,
    shareToken: requestedToken,
    title: meeting.title,
    subtitle: meeting.subtitle,
    scheduledAt: meeting.scheduledAt,
    durationSeconds: meeting.durationSeconds,
    hostName: meeting.hostName,
    mediaUrl: `/api/share-media/${encodeURIComponent(requestedToken)}`,
    summary: {
      templateName: activeSummary.templateName,
      tldr: activeSummary.tldr,
      sections: activeSummary.sections.map((sec) => ({
        id: sec.id,
        title: sec.title,
        items: sec.items.map((item) => ({
          id: item.id,
          text: item.text,
          timestampSeconds: item.timestampSeconds,
        })),
      })),
    },
    actionItems: meeting.actionItems.map((act) => ({
      id: act.id,
      title: act.title,
      assigneeName: act.assigneeName,
      completed: act.completed,
    })),
    transcript: meeting.transcript.map((seg) => ({
      id: seg.id,
      speakerName: seg.speakerName,
      speakerRole: seg.speakerRole,
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.text,
    })),
  };
}

/**
 * Resolves a public share token strictly on the server.
 * - Clip tokens (`c2_...` HMAC-signed tokens or seeded clip tokens) return `PublicClipShareView`.
 * - Full-meeting tokens (`share-...` or seeded meeting IDs) return `PublicMeetingShareView`.
 * - Invalid, tampered, expired, or unverified browser-local tokens return `null`.
 */
export function resolvePublicShare(rawToken: string): PublicShareResolution {
  if (typeof rawToken !== "string") return null;
  const token = rawToken.trim();
  if (!token || token.length > 1400) return null;

  // 1. Portable HMAC-SHA256 clip tokens (or legacy c1_ which are always rejected)
  if (token.startsWith("c2_") || token.startsWith("c1_")) {
    const verifiedClip = verifyPortableClipToken(token);
    if (!verifiedClip) return null;
    const parentMeeting = findCanonicalMeetingById(verifiedClip.meetingId);
    if (!parentMeeting) return null;
    return buildPublicClipShareView(verifiedClip, parentMeeting, token);
  }

  // 2. Seeded clip tokens (e.g., clip-acme-22min-pain, clip-acme-84k-budget)
  for (const m of INITIAL_MEETINGS) {
    const foundClip = m.highlights.find((h) => h.shareToken === token || h.id === token);
    if (foundClip) {
      return buildPublicClipShareView(foundClip, m, token);
    }
  }

  // Reject any other `clip-*` token (e.g., unverified browser-local clip IDs)
  if (token.startsWith("clip-")) {
    return null;
  }

  // 3. Seeded / canonical full-meeting share tokens
  for (const m of getAllCanonicalMeetings()) {
    if (m.shareToken === token || m.id === token) {
      return buildPublicMeetingShareView(m, token);
    }
  }

  return null;
}

/**
 * Resolves the underlying server audio file and authorized [startTime, endTime] bounds
 * for `/api/share-media/[token]`.
 */
export function resolveShareAudioSource(rawToken: string): ResolvedShareAudioSource | null {
  if (typeof rawToken !== "string") return null;
  const token = rawToken.trim();
  if (!token || token.length > 1400) return null;

  if (token.startsWith("c2_") || token.startsWith("c1_")) {
    const verifiedClip = verifyPortableClipToken(token);
    if (!verifiedClip) return null;
    const parentMeeting = findCanonicalMeetingById(verifiedClip.meetingId);
    if (!parentMeeting) return null;
    const S = Math.max(0, Math.min(parentMeeting.durationSeconds, Math.floor(verifiedClip.startTime)));
    const E = Math.max(S + 1, Math.min(parentMeeting.durationSeconds, Math.floor(verifiedClip.endTime)));
    return {
      kind: "clip",
      internalMediaPath: parentMeeting.mediaUrl,
      startTime: S,
      endTime: E,
      parentDurationSeconds: parentMeeting.durationSeconds,
    };
  }

  for (const m of INITIAL_MEETINGS) {
    const foundClip = m.highlights.find((h) => h.shareToken === token || h.id === token);
    if (foundClip) {
      const S = Math.max(0, Math.min(m.durationSeconds, Math.floor(foundClip.startTime)));
      const E = Math.max(S + 1, Math.min(m.durationSeconds, Math.floor(foundClip.endTime)));
      return {
        kind: "clip",
        internalMediaPath: m.mediaUrl,
        startTime: S,
        endTime: E,
        parentDurationSeconds: m.durationSeconds,
      };
    }
  }

  if (token.startsWith("clip-")) {
    return null;
  }

  for (const m of getAllCanonicalMeetings()) {
    if (m.shareToken === token || m.id === token) {
      return {
        kind: "meeting",
        internalMediaPath: m.mediaUrl,
        startTime: 0,
        endTime: m.durationSeconds,
        parentDurationSeconds: m.durationSeconds,
      };
    }
  }

  return null;
}
