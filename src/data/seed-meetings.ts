import {
  Meeting,
  MeetingSummary,
  Participant,
  SummaryTemplateId,
  TranscriptSegment,
  WorkspaceState,
} from "@/types/fathom";

export const SUMMARY_TEMPLATES_META: {
  id: SummaryTemplateId;
  name: string;
  badge: string;
  description: string;
}[] = [
  {
    id: "general",
    name: "General / Enhanced Summary",
    badge: "Default",
    description: "Structured executive overview, discussion topics, decisions, and next steps.",
  },
  {
    id: "meddpicc",
    name: "Sales Discovery (MEDDPICC)",
    badge: "Sales",
    description: "Formats captured notes into Metrics, Economic Buyer, Decision Criteria, and Pain.",
  },
  {
    id: "customer_success",
    name: "Customer Success / QBR",
    badge: "CS & Account",
    description: "Structures captured notes around adoption outcomes, technical requirements, and expansion.",
  },
  {
    id: "one_on_one",
    name: "1-on-1 Check-in",
    badge: "Leadership",
    description: "Organizes discussion points into key updates, open items, and agreed commitments.",
  },
  {
    id: "user_research",
    name: "Product Feedback & User Research",
    badge: "Product",
    description: "Groups transcript insights into workflow friction, feature requirements, and verbatim quotes.",
  },
  {
    id: "sprint_sync",
    name: "Engineering & Architecture Sync",
    badge: "Engineering",
    description: "Structures technical benchmarks, architecture decisions, and implementation tasks.",
  },
];

// Deterministic helper that computes each participant's talkTimeSeconds, talkTimePercentage,
// and questionsAsked directly from the meeting transcript (single source of truth).
function enrichParticipantsFromTranscript(
  participants: Omit<Participant, "talkTimeSeconds" | "talkTimePercentage" | "questionsAsked">[],
  transcript: TranscriptSegment[]
): Participant[] {
  const rawSecondsBySpeaker = new Map<string, number>();
  const questionsBySpeaker = new Map<string, number>();

  for (const seg of transcript) {
    const segDur = Math.max(1, seg.endTime - seg.startTime);
    rawSecondsBySpeaker.set(
      seg.speakerId,
      (rawSecondsBySpeaker.get(seg.speakerId) || 0) + segDur
    );
    const qCount = (seg.text.match(/\?/g) || []).length;
    questionsBySpeaker.set(
      seg.speakerId,
      (questionsBySpeaker.get(seg.speakerId) || 0) + qCount
    );
  }

  const totalSpokenSeconds =
    Array.from(rawSecondsBySpeaker.values()).reduce((a, b) => a + b, 0) || 1;

  let allocatedPct = 0;
  return participants.map((p, idx) => {
    const talkTimeSeconds = rawSecondsBySpeaker.get(p.id) || 0;
    const isLast = idx === participants.length - 1;
    const talkTimePercentage = isLast
      ? Math.max(0, 100 - allocatedPct)
      : Math.round((talkTimeSeconds / totalSpokenSeconds) * 100);
    allocatedPct += talkTimePercentage;

    return {
      ...p,
      talkTimeSeconds,
      talkTimePercentage,
      questionsAsked: questionsBySpeaker.get(p.id) || 0,
    };
  });
}

function computeMetricsFromTranscript(
  transcript: TranscriptSegment[],
  engagementScore: number
): Meeting["metrics"] {
  const questionsAsked = transcript.reduce(
    (sum, seg) => sum + (seg.text.match(/\?/g) || []).length,
    0
  );
  const longestMonologueSeconds = transcript.reduce(
    (max, seg) => Math.max(max, Math.max(1, seg.endTime - seg.startTime)),
    0
  );
  return {
    questionsAsked,
    longestMonologueSeconds,
    sentimentScore: "positive",
    engagementScore,
  };
}

// Helper to build all 6 template views grounded strictly in each meeting's actual transcript & decisions
function createTemplateVariants(
  base: {
    general: Omit<MeetingSummary, "templateId" | "templateName" | "templateBadge">;
    meddpicc?: Omit<MeetingSummary, "templateId" | "templateName" | "templateBadge">;
    customer_success?: Omit<MeetingSummary, "templateId" | "templateName" | "templateBadge">;
    one_on_one?: Omit<MeetingSummary, "templateId" | "templateName" | "templateBadge">;
    user_research?: Omit<MeetingSummary, "templateId" | "templateName" | "templateBadge">;
    sprint_sync?: Omit<MeetingSummary, "templateId" | "templateName" | "templateBadge">;
  },
  transcript: TranscriptSegment[],
  title: string
): Record<SummaryTemplateId, MeetingSummary> {
  const seg0 = transcript[0];
  const seg1 = transcript[1] || seg0;
  const seg2 = transcript[2] || seg1;
  const segLast = transcript[transcript.length - 1] || seg0;

  const general: MeetingSummary = {
    templateId: "general",
    templateName: "General / Enhanced Summary",
    templateBadge: "Default",
    ...base.general,
  };

  const meddpicc: MeetingSummary = {
    templateId: "meddpicc",
    templateName: "Sales Discovery (MEDDPICC)",
    templateBadge: "Sales",
    ...(base.meddpicc || {
      tldr: `${base.general.tldr}`,
      sections: [
        {
          id: "m-metrics",
          title: "Metrics & Quantifiable Outcomes",
          items: [
            {
              id: "mm-1",
              text: seg0.text,
              timestampSeconds: seg0.startTime,
              speakerName: seg0.speakerName,
              badge: "Context & Scope",
            },
            {
              id: "mm-2",
              text: seg1.text,
              timestampSeconds: seg1.startTime,
              speakerName: seg1.speakerName,
              badge: "Measured Impact",
            },
          ],
        },
        {
          id: "m-criteria",
          title: "Decision Criteria & Technical Validation",
          items: [
            {
              id: "mc-1",
              text: seg2.text,
              timestampSeconds: seg2.startTime,
              speakerName: seg2.speakerName,
              badge: "Decision Criteria",
            },
          ],
        },
        {
          id: "m-next",
          title: " Stakeholder Alignment & Next Steps",
          items: [
            {
              id: "mn-1",
              text: segLast.text,
              timestampSeconds: segLast.startTime,
              speakerName: segLast.speakerName,
              badge: "Commitment",
            },
          ],
        },
      ],
      keyDecisions: base.general.keyDecisions,
      followUpEmailDraft: base.general.followUpEmailDraft,
    }),
  };

  const customer_success: MeetingSummary = {
    templateId: "customer_success",
    templateName: "Customer Success / QBR",
    templateBadge: "CS & Account",
    ...(base.customer_success || {
      tldr: `${base.general.tldr}`,
      sections: [
        {
          id: "cs-outcomes",
          title: "Adoption & Workflow Outcomes",
          items: [
            {
              id: "cso-1",
              text: seg0.text,
              timestampSeconds: seg0.startTime,
              speakerName: seg0.speakerName,
              badge: "Baseline",
            },
            {
              id: "cso-2",
              text: seg1.text,
              timestampSeconds: seg1.startTime,
              speakerName: seg1.speakerName,
              badge: "Customer Voice",
            },
          ],
        },
        {
          id: "cs-reqs",
          title: "Technical Requirements & Rollout Plan",
          items: [
            {
              id: "csr-1",
              text: seg2.text,
              timestampSeconds: seg2.startTime,
              speakerName: seg2.speakerName,
              badge: "Requirement",
            },
            {
              id: "csr-2",
              text: segLast.text,
              timestampSeconds: segLast.startTime,
              speakerName: segLast.speakerName,
              badge: "Next Milestone",
            },
          ],
        },
      ],
      keyDecisions: base.general.keyDecisions,
      followUpEmailDraft: base.general.followUpEmailDraft,
    }),
  };

  const one_on_one: MeetingSummary = {
    templateId: "one_on_one",
    templateName: "1-on-1 Check-in",
    templateBadge: "Leadership",
    ...(base.one_on_one || {
      tldr: `${base.general.tldr}`,
      sections: [
        {
          id: "oo-focus",
          title: "Discussion Focus & Progress Updates",
          items: [
            {
              id: "oof-1",
              text: seg0.text,
              timestampSeconds: seg0.startTime,
              speakerName: seg0.speakerName,
            },
            {
              id: "oof-2",
              text: seg1.text,
              timestampSeconds: seg1.startTime,
              speakerName: seg1.speakerName,
            },
          ],
        },
        {
          id: "oo-follow",
          title: "Key Takeaways & Commitments",
          items: [
            {
              id: "oofl-1",
              text: seg2.text,
              timestampSeconds: seg2.startTime,
              speakerName: seg2.speakerName,
            },
            {
              id: "oofl-2",
              text: segLast.text,
              timestampSeconds: segLast.startTime,
              speakerName: segLast.speakerName,
              badge: "Agreed Follow-Up",
            },
          ],
        },
      ],
      keyDecisions: base.general.keyDecisions,
      followUpEmailDraft: base.general.followUpEmailDraft,
    }),
  };

  const user_research: MeetingSummary = {
    templateId: "user_research",
    templateName: "Product Feedback & User Research",
    templateBadge: "Product",
    ...(base.user_research || {
      tldr: `${base.general.tldr}`,
      sections: [
        {
          id: "ur-pain",
          title: "Observed Workflow Friction & Context",
          items: [
            {
              id: "urp-1",
              text: seg0.text,
              timestampSeconds: seg0.startTime,
              speakerName: seg0.speakerName,
            },
            {
              id: "urp-2",
              text: seg1.text,
              timestampSeconds: seg1.startTime,
              speakerName: seg1.speakerName,
              badge: "Primary Insight",
            },
          ],
        },
        {
          id: "ur-reqs",
          title: "Feature Requirements & Verbatim Feedback",
          items: [
            {
              id: "urr-1",
              text: seg2.text,
              timestampSeconds: seg2.startTime,
              speakerName: seg2.speakerName,
              badge: "Requirement",
            },
            {
              id: "urr-2",
              text: segLast.text,
              timestampSeconds: segLast.startTime,
              speakerName: segLast.speakerName,
            },
          ],
        },
      ],
      keyDecisions: base.general.keyDecisions,
      followUpEmailDraft: base.general.followUpEmailDraft,
    }),
  };

  const sprint_sync: MeetingSummary = {
    templateId: "sprint_sync",
    templateName: "Engineering & Architecture Sync",
    templateBadge: "Engineering",
    ...(base.sprint_sync || {
      tldr: `${base.general.tldr}`,
      sections: [
        {
          id: "ss-tech",
          title: "Technical Discussion & System Requirements",
          items: [
            {
              id: "sst-1",
              text: seg0.text,
              timestampSeconds: seg0.startTime,
              speakerName: seg0.speakerName,
            },
            {
              id: "sst-2",
              text: seg1.text,
              timestampSeconds: seg1.startTime,
              speakerName: seg1.speakerName,
              badge: "System Metric",
            },
          ],
        },
        {
          id: "ss-exec",
          title: "Implementation & Verification Plan",
          items: [
            {
              id: "sse-1",
              text: seg2.text,
              timestampSeconds: seg2.startTime,
              speakerName: seg2.speakerName,
            },
            {
              id: "sse-2",
              text: segLast.text,
              timestampSeconds: segLast.startTime,
              speakerName: segLast.speakerName,
              badge: "Execution",
            },
          ],
        },
      ],
      keyDecisions: base.general.keyDecisions,
      followUpEmailDraft: base.general.followUpEmailDraft,
    }),
  };

  void title;
  return {
    general,
    meddpicc,
    customer_success,
    one_on_one,
    user_research,
    sprint_sync,
  };
}

const meeting1Transcript: TranscriptSegment[] = [
  {
    id: "m1-t1",
    meetingId: "mtg-acme-discovery",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 0,
    endTime: 18,
    text: "Thanks for joining today, Elena and Marcus. Our main goal for this discovery session is understanding how Acme Corp's 65-person revenue and product organization currently captures customer calls and where insights are getting lost between Zoom, HubSpot, and Linear.",
  },
  {
    id: "m1-t2",
    meetingId: "mtg-acme-discovery",
    speakerId: "spk-elena",
    speakerName: "Elena Rostova",
    speakerRole: "VP of Revenue Operations, Acme Corp",
    speakerColor: "#00D4B2",
    isExternal: true,
    startTime: 19,
    endTime: 46,
    text: "Appreciate you setting this up. Honestly, our biggest pain point right now is post-call admin drag. Each Account Executive spends 22 minutes after every discovery call typing notes into HubSpot, and even then, our product team never hears the raw voice of the customer when pricing or security objections come up.",
    highlightId: "clip-acme-pain",
  },
  {
    id: "m1-t3",
    meetingId: "mtg-acme-discovery",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 47,
    endTime: 74,
    text: "That 22-minute gap is exactly what we eliminate. With Fathom, the moment your call ends, we generate a structured MEDDPICC summary with clickable timestamps, extract every action item by owner, and sync the fields straight into your HubSpot deal stage automatically.",
  },
  {
    id: "m1-t4",
    meetingId: "mtg-acme-discovery",
    speakerId: "spk-marcus",
    speakerName: "Marcus Vance",
    speakerRole: "Head of Security & IT, Acme Corp",
    speakerColor: "#F59E0B",
    isExternal: true,
    startTime: 75,
    endTime: 108,
    text: "From an IT and InfoSec standpoint, two things are non-negotiable for our Q4 rollout: SOC2 Type II compliance with zero training on our proprietary customer audio, and the ability to share 30-second highlight clips externally with prospects without forcing them to create an account.",
    highlightId: "clip-acme-security",
  },
  {
    id: "m1-t5",
    meetingId: "mtg-acme-discovery",
    speakerId: "spk-elena",
    speakerName: "Elena Rostova",
    speakerRole: "VP of Revenue Operations, Acme Corp",
    speakerColor: "#00D4B2",
    isExternal: true,
    startTime: 109,
    endTime: 132,
    text: "Exactly. If we can validate the HubSpot bi-directional sync in a 15-seat pilot by next Thursday and pass Marcus's SOC2 review, we have $84,000 in approved Q4 budget ready to deploy across all 65 reps before November 20th.",
    highlightId: "clip-acme-budget",
  },
  {
    id: "m1-t6",
    meetingId: "mtg-acme-discovery",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 133,
    endTime: 150,
    text: "Perfect alignment. I will send over our SOC2 Type II security packet and DPA to Marcus today, configure the 15-seat HubSpot sandbox for Elena by Tuesday, and schedule our technical pilot review for next Thursday at 10 AM EST.",
  },
];

const meeting2Transcript: TranscriptSegment[] = [
  {
    id: "m2-t1",
    meetingId: "mtg-linear-product",
    speakerId: "spk-claire",
    speakerName: "Claire Moreau",
    speakerRole: "Staff Product Designer",
    speakerColor: "#EC4899",
    isExternal: false,
    startTime: 0,
    endTime: 24,
    text: "Let's dive into the Q4 AI Summary Template & Clip Sharing UX review. We interviewed 18 power users this week, and the number one workflow request was being able to switch between General, MEDDPICC, and User Research templates without losing custom highlights.",
  },
  {
    id: "m2-t2",
    meetingId: "mtg-linear-product",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 25,
    endTime: 52,
    text: "Agreed. I profiled the state transitions yesterday—by pre-indexing transcript timestamps against each template framework, switching from General Summary to MEDDPICC or User Research happens in under 15 milliseconds with zero page reload.",
    highlightId: "clip-template-speed",
  },
  {
    id: "m2-t3",
    meetingId: "mtg-linear-product",
    speakerId: "spk-devon",
    speakerName: "Devon Brooks",
    speakerRole: "Principal Systems Architect",
    speakerColor: "#10B981",
    isExternal: false,
    startTime: 53,
    endTime: 85,
    text: "One critical detail on the recording player: when someone clicks a timestamp badge inside the AI Summary or clicks any line in the transcript, the audio player must immediately seek to that exact second and highlight the active speaker block in real time.",
    highlightId: "clip-player-sync",
  },
  {
    id: "m2-t4",
    meetingId: "mtg-linear-product",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 86,
    endTime: 120,
    text: "100%. We've wired bidirectional synchronization between the HTML5 media element, the timeline chapter scrubber, and the transcript scroll container. I'll finalize the public logged-out share view today so external stakeholders can play clips without signing in.",
  },
];

const meeting3Transcript: TranscriptSegment[] = [
  {
    id: "m3-t1",
    meetingId: "mtg-stripe-qbr",
    speakerId: "spk-sarah",
    speakerName: "Sarah Jenkins",
    speakerRole: "Director of Customer Success, FinScale",
    speakerColor: "#38BDF8",
    isExternal: true,
    startTime: 0,
    endTime: 22,
    text: "Thanks for hosting our Q3 Executive Business Review. Over the past 90 days, our Customer Success and Solutions teams recorded 412 client onboarding calls with Fathom, cutting weekly recap preparation time from 4 hours per CSM down to 15 minutes.",
    highlightId: "clip-finscale-roi",
  },
  {
    id: "m3-t2",
    meetingId: "mtg-stripe-qbr",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 23,
    endTime: 54,
    text: "Those adoption metrics are phenomenal, Sarah—94% active seat utilization across your 40 CSMs. Looking at your Q4 expansion roadmap, how can we make the handoff between Sales Discovery calls and CS Onboarding even smoother?",
  },
  {
    id: "m3-t3",
    meetingId: "mtg-stripe-qbr",
    speakerId: "spk-raj",
    speakerName: "Raj Patel",
    speakerRole: "VP of Solutions Architecture, FinScale",
    speakerColor: "#A855F7",
    isExternal: true,
    startTime: 55,
    endTime: 88,
    text: "The game-changer for my Solutions Architects is playlist clips. Instead of asking an engineer to watch a 55-minute discovery call, our AEs send a 40-second highlight clip of the customer explaining their API topology. We want to add 25 Solutions Engineering seats next month.",
    highlightId: "clip-finscale-expansion",
  },
  {
    id: "m3-t4",
    meetingId: "mtg-stripe-qbr",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 89,
    endTime: 115,
    text: "We can provision those 25 Solutions Engineering seats today and enable your custom QBR & Technical Handoff summary templates across the entire workspace.",
  },
  {
    id: "m3-t5",
    meetingId: "mtg-stripe-qbr",
    speakerId: "spk-sarah",
    speakerName: "Sarah Jenkins",
    speakerRole: "Director of Customer Success, FinScale",
    speakerColor: "#38BDF8",
    isExternal: true,
    startTime: 116,
    endTime: 135,
    text: "Awesome. Send over the updated order form for the 25 additional seats by Friday, and let's turn on the automated Slack clip alerts for our #customer-voice channel.",
  },
];

const meeting4Transcript: TranscriptSegment[] = [
  {
    id: "m4-t1",
    meetingId: "mtg-eng-architecture",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 0,
    endTime: 20,
    text: "Quick engineering standup on the real-time transcription pipeline and speaker diarization latency. How did the multi-participant benchmark perform on 60-minute calls with 6+ speakers?",
  },
  {
    id: "m4-t2",
    meetingId: "mtg-eng-architecture",
    speakerId: "spk-liam",
    speakerName: "Liam O'Connor",
    speakerRole: "Senior ML Audio Engineer",
    speakerColor: "#F97316",
    isExternal: false,
    startTime: 21,
    endTime: 48,
    text: "Word error rate dropped to 3.1% after enabling acoustic echo cancellation and per-channel speaker diarization. Even when two participants overlap during technical debates, speaker attribution stays locked above 97% accuracy.",
    highlightId: "clip-eng-wer",
  },
  {
    id: "m4-t3",
    meetingId: "mtg-eng-architecture",
    speakerId: "spk-priya",
    speakerName: "Priya Nair",
    speakerRole: "Staff Backend Engineer",
    speakerColor: "#14B8A6",
    isExternal: false,
    startTime: 49,
    endTime: 78,
    text: "On the storage and search side, full-text indexing across meeting titles, speaker names, summaries, and transcript utterances now returns ranked snippets in under 25ms. I also added speaker filter chips so users can isolate any participant's lines.",
  },
  {
    id: "m4-t4",
    meetingId: "mtg-eng-architecture",
    speakerId: "spk-hasnain",
    speakerName: "Hasnain Janjua",
    speakerRole: "Lead Product Engineer",
    speakerColor: "#6366F1",
    isExternal: false,
    startTime: 79,
    endTime: 105,
    text: "Great progress. Let's ship the speaker talk-time distribution bar and monologue detection metrics to production this afternoon and verify all public share links in an incognito session.",
  },
];

export const INITIAL_MEETINGS: Meeting[] = [
  {
    id: "mtg-acme-discovery",
    title: "Acme Corp — Enterprise Discovery & MEDDPICC Qualification",
    subtitle: "65-Seat Revenue & Product Rollout ($84k ARR Opportunity)",
    category: "sales_discovery",
    platform: "zoom",
    status: "completed",
    scope: "my_calls",
    visibility: "public_link",
    shareToken: "share-acme-q4-discovery",
    scheduledAt: "2026-11-02T14:00:00Z",
    startedAt: "2026-11-02T14:01:12Z",
    durationSeconds: 150,
    hostId: "usr-hasnain",
    hostName: "Hasnain Janjua",
    accountName: "Acme Corp",
    dealValue: "$84,000 ARR",
    dealStage: "Technical Validation",
    mediaUrl: "/media/meeting-acme-discovery.wav",
    mediaType: "audio",
    isSimulatedCapture: false,
    activeTemplateId: "meddpicc",
    participants: enrichParticipantsFromTranscript(
      [
        {
          id: "spk-hasnain",
          name: "Hasnain Janjua",
          email: "hasnain@fathom.video",
          role: "Lead Product Engineer",
          company: "Fathom AI",
          isExternal: false,
          avatarColor: "#6366F1",
          initials: "HJ",
        },
        {
          id: "spk-elena",
          name: "Elena Rostova",
          email: "elena.rostova@acmecorp.io",
          role: "VP of Revenue Operations",
          company: "Acme Corp",
          isExternal: true,
          avatarColor: "#00D4B2",
          initials: "ER",
        },
        {
          id: "spk-marcus",
          name: "Marcus Vance",
          email: "m.vance@acmecorp.io",
          role: "Head of Security & IT",
          company: "Acme Corp",
          isExternal: true,
          avatarColor: "#F59E0B",
          initials: "MV",
        },
      ],
      meeting1Transcript
    ),
    transcript: meeting1Transcript,
    chapters: [
      {
        id: "ch-1",
        title: "Introductions & Current Post-Call Admin Drag",
        startTime: 0,
        endTime: 46,
        summary: "Elena outlines the 22-minute post-call manual CRM entry bottleneck across 65 AEs.",
      },
      {
        id: "ch-2",
        title: "Automated MEDDPICC & HubSpot Sync Demo",
        startTime: 47,
        endTime: 74,
        summary: "Walkthrough of instant AI summary templates and automatic HubSpot deal stage updates.",
      },
      {
        id: "ch-3",
        title: "SOC2 Type II Security & External Clip Sharing",
        startTime: 75,
        endTime: 108,
        summary: "Marcus defines InfoSec requirements: SOC2 Type II packet, zero model training, and unauthenticated clip links.",
      },
      {
        id: "ch-4",
        title: "$84k Budget Confirmation & 15-Seat Pilot Timeline",
        startTime: 109,
        endTime: 150,
        summary: "Approved $84k Q4 budget confirmed pending next Thursday's 15-seat HubSpot sandbox pilot.",
      },
    ],
    summariesByTemplate: createTemplateVariants(
      {
        general: {
          tldr: "Elena Rostova (VP RevOps) and Marcus Vance (Head of Security) confirmed an approved $84,000 Q4 budget for a 65-seat rollout, contingent on a 15-seat HubSpot sandbox pilot concluding next Thursday and SOC2 Type II documentation sign-off.",
          sections: [
            {
              id: "sec-pain",
              title: "Key Discussion Points & Customer Pain",
              items: [
                {
                  id: "item-1",
                  text: "Acme Corp's 65 Account Executives currently spend ~22 minutes per call manually typing notes into HubSpot, causing severe admin drag.",
                  timestampSeconds: 19,
                  speakerName: "Elena Rostova",
                  badge: "Customer Pain",
                },
                {
                  id: "item-2",
                  text: "Product leaders lack visibility into raw customer objections because call insights aren't clipped or routed to Linear.",
                  timestampSeconds: 31,
                  speakerName: "Elena Rostova",
                },
                {
                  id: "item-3",
                  text: "Demonstrated Fathom's instant MEDDPICC template generation and automatic bi-directional HubSpot field sync.",
                  timestampSeconds: 47,
                  speakerName: "Hasnain Janjua",
                  badge: "Solution Fit",
                },
              ],
            },
            {
              id: "sec-sec",
              title: "Security, Compliance & Technical Requirements",
              items: [
                {
                  id: "item-4",
                  text: "Requires SOC2 Type II attestation and contractual guarantee of zero LLM training on Acme's proprietary customer audio.",
                  timestampSeconds: 75,
                  speakerName: "Marcus Vance",
                  badge: "InfoSec Gate",
                },
                {
                  id: "item-5",
                  text: "External prospects must be able to view shared 30-second highlight clips via public link without creating an account.",
                  timestampSeconds: 92,
                  speakerName: "Marcus Vance",
                },
              ],
            },
          ],
          keyDecisions: [
            {
              id: "dec-1",
              decision: "Launch 15-seat HubSpot bi-directional sync pilot by Tuesday ahead of full 65-seat ($84k ARR) deployment before Nov 20.",
              timestampSeconds: 109,
              ownerName: "Elena Rostova",
              impact: "high",
            },
            {
              id: "dec-2",
              decision: "Deliver SOC2 Type II security packet and Data Processing Addendum (DPA) to Acme InfoSec today.",
              timestampSeconds: 133,
              ownerName: "Hasnain Janjua",
              impact: "high",
            },
          ],
          followUpEmailDraft: {
            subject: "Recap & Next Steps: Acme Corp x Fathom AI ($84k Q4 Rollout & Pilot)",
            body: `Hi Elena and Marcus,\n\nThank you for a productive discovery session today. Here is a quick summary of what we aligned on:\n\nKey Takeaways:\n• Eliminating the 22-minute post-call HubSpot note-taking bottleneck across your 65 AEs.\n• Empowering reps and PMs to share 30-second customer voice clips via public links.\n• Confirmed $84,000 Q4 budget allocation targeting full rollout before November 20th.\n\nAgreed Next Steps:\n1. [Hasnain] Send SOC2 Type II certification packet & zero-training DPA to Marcus (Today).\n2. [Hasnain & Elena] Provision 15-seat HubSpot sandbox pilot (By Tuesday).\n3. [All] Reconvene next Thursday at 10:00 AM EST for pilot sign-off.\n\nBest,\nHasnain Janjua`,
          },
        },
        meddpicc: {
          tldr: "High-conviction Enterprise opportunity ($84,000 ARR, 65 seats). Economic Buyer (Elena Rostova, VP RevOps) confirmed approved Q4 budget; Technical/Security Buyer (Marcus Vance) outlined clear SOC2 Type II and public clip-sharing criteria.",
          sections: [
            {
              id: "med-m",
              title: "M — Metrics (Quantifiable Value)",
              items: [
                {
                  id: "med-m1",
                  text: "Eliminate 22 minutes of manual CRM admin per call across 65 Account Executives (~475 hours saved per week).",
                  timestampSeconds: 19,
                  speakerName: "Elena Rostova",
                  badge: "22m / Call Saved",
                },
              ],
            },
            {
              id: "med-e",
              title: "E — Economic Buyer & Budget",
              items: [
                {
                  id: "med-e1",
                  text: "Elena Rostova (VP of Revenue Operations) holds direct budget authority with $84,000 approved for Q4 deployment before Nov 20.",
                  timestampSeconds: 109,
                  speakerName: "Elena Rostova",
                  badge: "$84,000 Approved",
                },
              ],
            },
            {
              id: "med-d",
              title: "D — Decision Criteria & Process",
              items: [
                {
                  id: "med-d1",
                  text: "Technical Gate 1: Bi-directional HubSpot deal stage sync validated in a 15-seat pilot by next Thursday.",
                  timestampSeconds: 109,
                  speakerName: "Elena Rostova",
                  badge: "Pilot Gate",
                },
                {
                  id: "med-d2",
                  text: "Security Gate 2: SOC2 Type II report + zero audio training DPA approved by Marcus Vance.",
                  timestampSeconds: 75,
                  speakerName: "Marcus Vance",
                  badge: "Security Gate",
                },
              ],
            },
            {
              id: "med-p",
              title: "P & C — Pain & Champion",
              items: [
                {
                  id: "med-p1",
                  text: "Acute Pain: Reps hate manual HubSpot data entry and Product never hears verbatim pricing/security objections.",
                  timestampSeconds: 26,
                  speakerName: "Elena Rostova",
                  badge: "Acute Pain",
                },
              ],
            },
          ],
          keyDecisions: [
            {
              id: "dec-m1",
              decision: "Approved $84k Q4 budget moves to procurement immediately upon Thursday's 15-seat HubSpot pilot sign-off.",
              timestampSeconds: 109,
              ownerName: "Elena Rostova",
              impact: "high",
            },
          ],
          followUpEmailDraft: {
            subject: "MEDDPICC Pilot Plan & SOC2 Packet — Acme Corp x Fathom AI",
            body: `Hi Elena and Marcus,\n\nAttached is our SOC2 Type II documentation and the 15-seat HubSpot sandbox pilot checklist ahead of our November 20th rollout target.\n\nBest,\nHasnain`,
          },
        },
      },
      meeting1Transcript,
      "Acme Corp — Enterprise Discovery & MEDDPICC Qualification"
    ),
    actionItems: [
      {
        id: "act-acme-1",
        meetingId: "mtg-acme-discovery",
        meetingTitle: "Acme Corp — Enterprise Discovery & MEDDPICC Qualification",
        title: "Send SOC2 Type II certification packet and zero-training DPA to Marcus Vance",
        assigneeId: "spk-hasnain",
        assigneeName: "Hasnain Janjua",
        assigneeEmail: "hasnain@fathom.video",
        assigneeCompany: "Fathom AI",
        dueDate: "Mon, Nov 2",
        completed: true,
        priority: "high",
        timestampSeconds: 133,
        syncedTo: ["hubspot", "slack"],
      },
      {
        id: "act-acme-2",
        meetingId: "mtg-acme-discovery",
        meetingTitle: "Acme Corp — Enterprise Discovery & MEDDPICC Qualification",
        title: "Provision 15-seat HubSpot bi-directional sync sandbox for Acme RevOps pilot",
        assigneeId: "spk-hasnain",
        assigneeName: "Hasnain Janjua",
        assigneeEmail: "hasnain@fathom.video",
        assigneeCompany: "Fathom AI",
        dueDate: "Tue, Nov 3",
        completed: false,
        priority: "high",
        timestampSeconds: 138,
        syncedTo: ["hubspot", "linear"],
      },
      {
        id: "act-acme-3",
        meetingId: "mtg-acme-discovery",
        meetingTitle: "Acme Corp — Enterprise Discovery & MEDDPICC Qualification",
        title: "Share list of 15 pilot Account Executives and custom HubSpot deal property mappings",
        assigneeId: "spk-elena",
        assigneeName: "Elena Rostova",
        assigneeEmail: "elena.rostova@acmecorp.io",
        assigneeCompany: "Acme Corp",
        dueDate: "Wed, Nov 4",
        completed: false,
        priority: "medium",
        timestampSeconds: 112,
        syncedTo: ["hubspot"],
      },
    ],
    highlights: [
      {
        id: "clip-acme-pain",
        meetingId: "mtg-acme-discovery",
        meetingTitle: "Acme Corp — Enterprise Discovery & MEDDPICC Qualification",
        title: "22-Min Post-Call HubSpot Admin Drag Across 65 AEs",
        tag: "Customer Pain",
        startTime: 19,
        endTime: 46,
        createdBy: "Hasnain Janjua",
        createdAt: "2026-11-02T14:04:00Z",
        notes: "Critical pain quote from VP RevOps explaining why manual CRM entry is failing.",
        shareToken: "clip-acme-22min-pain",
        viewCount: 14,
        speakerName: "Elena Rostova",
        transcriptExcerpt:
          "Each Account Executive spends 22 minutes after every discovery call typing notes into HubSpot, and even then, our product team never hears the raw voice of the customer...",
      },
      {
        id: "clip-acme-security",
        meetingId: "mtg-acme-discovery",
        meetingTitle: "Acme Corp — Enterprise Discovery & MEDDPICC Qualification",
        title: "SOC2 Type II & Unauthenticated Clip Sharing Requirement",
        tag: "Key Insight",
        startTime: 75,
        endTime: 108,
        createdBy: "Hasnain Janjua",
        createdAt: "2026-11-02T14:05:10Z",
        notes: "Marcus Vance outlining InfoSec gates and external clip sharing workflow.",
        shareToken: "clip-acme-soc2-gate",
        viewCount: 9,
        speakerName: "Marcus Vance",
        transcriptExcerpt:
          "From an IT and InfoSec standpoint, two things are non-negotiable for our Q4 rollout: SOC2 Type II compliance with zero training on our proprietary customer audio...",
      },
      {
        id: "clip-acme-budget",
        meetingId: "mtg-acme-discovery",
        meetingTitle: "Acme Corp — Enterprise Discovery & MEDDPICC Qualification",
        title: "$84,000 Approved Q4 Budget & Nov 20 Rollout Target",
        tag: "Decision",
        startTime: 109,
        endTime: 132,
        createdBy: "Hasnain Janjua",
        createdAt: "2026-11-02T14:06:20Z",
        notes: "Economic buyer verbal confirmation of $84k budget.",
        shareToken: "clip-acme-84k-budget",
        viewCount: 27,
        speakerName: "Elena Rostova",
        transcriptExcerpt:
          "If we can validate the HubSpot bi-directional sync in a 15-seat pilot by next Thursday and pass Marcus's SOC2 review, we have $84,000 in approved Q4 budget ready...",
      },
    ],
    metrics: computeMetricsFromTranscript(meeting1Transcript, 94),
  },
  {
    id: "mtg-linear-product",
    title: "Q4 Product & UX Review — AI Summary Templates & Clip Studio",
    subtitle: "User Research Synthesis & Zero-Latency Playback Architecture",
    category: "product_feedback",
    platform: "google_meet",
    status: "completed",
    scope: "my_calls",
    visibility: "team",
    shareToken: "share-q4-product-ux",
    scheduledAt: "2026-11-02T11:30:00Z",
    startedAt: "2026-11-02T11:30:45Z",
    durationSeconds: 120,
    hostId: "usr-hasnain",
    hostName: "Hasnain Janjua",
    accountName: "Internal Product Pod",
    mediaUrl: "/media/meeting-product-design.wav",
    mediaType: "audio",
    isSimulatedCapture: false,
    activeTemplateId: "user_research",
    participants: enrichParticipantsFromTranscript(
      [
        {
          id: "spk-hasnain",
          name: "Hasnain Janjua",
          email: "hasnain@fathom.video",
          role: "Lead Product Engineer",
          company: "Fathom AI",
          isExternal: false,
          avatarColor: "#6366F1",
          initials: "HJ",
        },
        {
          id: "spk-claire",
          name: "Claire Moreau",
          email: "claire@fathom.video",
          role: "Staff Product Designer",
          company: "Fathom AI",
          isExternal: false,
          avatarColor: "#EC4899",
          initials: "CM",
        },
        {
          id: "spk-devon",
          name: "Devon Brooks",
          email: "devon@fathom.video",
          role: "Principal Systems Architect",
          company: "Fathom AI",
          isExternal: false,
          avatarColor: "#10B981",
          initials: "DB",
        },
      ],
      meeting2Transcript
    ),
    transcript: meeting2Transcript,
    chapters: [
      {
        id: "m2-ch1",
        title: "Insights from 18 Power-User Interviews",
        startTime: 0,
        endTime: 24,
        summary: "Claire presents findings on template switching while preserving user-created highlights.",
      },
      {
        id: "m2-ch2",
        title: "Sub-15ms Template Switching Engine",
        startTime: 25,
        endTime: 52,
        summary: "Hasnain details pre-indexed transcript mapping for instantaneous framework switching.",
      },
      {
        id: "m2-ch3",
        title: "Bidirectional Timestamp & Audio Scrubbing Sync",
        startTime: 53,
        endTime: 120,
        summary: "Devon and Hasnain align on real-time transcript auto-scroll and public logged-out share routes.",
      },
    ],
    summariesByTemplate: createTemplateVariants(
      {
        general: {
          tldr: "Reviewed findings from 18 customer interviews and finalized the sub-15ms AI template switching engine, bidirectional transcript-to-audio seeking, and unauthenticated public share views.",
          sections: [
            {
              id: "p-sec1",
              title: "User Research Takeaways",
              items: [
                {
                  id: "p-i1",
                  text: "Power users frequently switch between General, MEDDPICC, and User Research templates depending on whether they are sharing notes with Sales, Product, or Execs.",
                  timestampSeconds: 0,
                  speakerName: "Claire Moreau",
                  badge: "18 User Interviews",
                },
                {
                  id: "p-i2",
                  text: "Pre-indexed transcript mappings allow switching across all 6 summary templates in under 15ms without losing custom highlight clips.",
                  timestampSeconds: 25,
                  speakerName: "Hasnain Janjua",
                  badge: "Performance",
                },
              ],
            },
            {
              id: "p-sec2",
              title: "Playback & Sharing Experience",
              items: [
                {
                  id: "p-i3",
                  text: "Every timestamp badge in AI summaries and every transcript utterance directly seeks the HTML5 media player and highlights the active speaker.",
                  timestampSeconds: 53,
                  speakerName: "Devon Brooks",
                },
              ],
            },
          ],
          keyDecisions: [
            {
              id: "p-dec1",
              decision: "Ship bidirectional timestamp synchronization and public share views for external stakeholders.",
              timestampSeconds: 86,
              ownerName: "Hasnain Janjua",
              impact: "high",
            },
          ],
          followUpEmailDraft: {
            subject: "Product Sync Notes: Template Switching & Public Clip Sharing",
            body: `Team,\n\nGreat alignment today on the Q4 AI Summary Template switcher and synchronized player.\n\nAction Items:\n• [Hasnain] Finalize public share view so external stakeholders can play clips without signing in.\n• [Claire] Audit keyboard shortcut accessibility for global search (Cmd/Ctrl+K).\n\nBest,\nHasnain`,
          },
        },
      },
      meeting2Transcript,
      "Q4 Product & UX Review — AI Summary Templates & Clip Studio"
    ),
    actionItems: [
      {
        id: "act-prod-1",
        meetingId: "mtg-linear-product",
        meetingTitle: "Q4 Product & UX Review — AI Summary Templates & Clip Studio",
        title: "Finalize public share view so external stakeholders can play highlight clips without signing in",
        assigneeId: "spk-hasnain",
        assigneeName: "Hasnain Janjua",
        assigneeEmail: "hasnain@fathom.video",
        assigneeCompany: "Fathom AI",
        dueDate: "Mon, Nov 2",
        completed: true,
        priority: "high",
        timestampSeconds: 86,
        syncedTo: ["linear", "notion"],
      },
      {
        id: "act-prod-2",
        meetingId: "mtg-linear-product",
        meetingTitle: "Q4 Product & UX Review — AI Summary Templates & Clip Studio",
        title: "Audit keyboard shortcut accessibility for global search (Cmd/Ctrl+K)",
        assigneeId: "spk-claire",
        assigneeName: "Claire Moreau",
        assigneeEmail: "claire@fathom.video",
        assigneeCompany: "Fathom AI",
        dueDate: "Wed, Nov 4",
        completed: false,
        priority: "medium",
        timestampSeconds: 18,
        syncedTo: ["linear"],
      },
    ],
    highlights: [
      {
        id: "clip-template-speed",
        meetingId: "mtg-linear-product",
        meetingTitle: "Q4 Product & UX Review — AI Summary Templates & Clip Studio",
        title: "Sub-15ms AI Summary Template Switching Architecture",
        tag: "Feature Request",
        startTime: 25,
        endTime: 52,
        createdBy: "Claire Moreau",
        createdAt: "2026-11-02T11:34:00Z",
        shareToken: "clip-sub15ms-templates",
        viewCount: 19,
        speakerName: "Hasnain Janjua",
        transcriptExcerpt:
          "By pre-indexing transcript timestamps against each template framework, switching from General Summary to MEDDPICC or User Research happens in under 15 milliseconds...",
      },
      {
        id: "clip-player-sync",
        meetingId: "mtg-linear-product",
        meetingTitle: "Q4 Product & UX Review — AI Summary Templates & Clip Studio",
        title: "Clickable Summary Timestamps & Real-Time Speaker Sync",
        tag: "Key Insight",
        startTime: 53,
        endTime: 85,
        createdBy: "Devon Brooks",
        createdAt: "2026-11-02T11:36:00Z",
        shareToken: "clip-player-timestamp-sync",
        viewCount: 11,
        speakerName: "Devon Brooks",
        transcriptExcerpt:
          "When someone clicks a timestamp badge inside the AI Summary or clicks any line in the transcript, the audio player must immediately seek to that exact second...",
      },
    ],
    metrics: computeMetricsFromTranscript(meeting2Transcript, 96),
  },
  {
    id: "mtg-stripe-qbr",
    title: "FinScale Global — Q3 Customer Success QBR & 25-Seat Expansion",
    subtitle: "94% Seat Utilization, 412 Calls Recorded & Solutions Engineering Upsell",
    category: "customer_qbr",
    platform: "zoom",
    status: "completed",
    scope: "team_calls",
    visibility: "public_link",
    shareToken: "share-finscale-qbr",
    scheduledAt: "2026-10-30T16:00:00Z",
    startedAt: "2026-10-30T16:00:15Z",
    durationSeconds: 135,
    hostId: "usr-hasnain",
    hostName: "Hasnain Janjua",
    accountName: "FinScale Global",
    dealValue: "$118,000 ARR (+25 Seats)",
    dealStage: "Expansion Won",
    mediaUrl: "/media/meeting-stripe-qbr.wav",
    mediaType: "audio",
    isSimulatedCapture: false,
    activeTemplateId: "customer_success",
    participants: enrichParticipantsFromTranscript(
      [
        {
          id: "spk-hasnain",
          name: "Hasnain Janjua",
          email: "hasnain@fathom.video",
          role: "Lead Product Engineer",
          company: "Fathom AI",
          isExternal: false,
          avatarColor: "#6366F1",
          initials: "HJ",
        },
        {
          id: "spk-sarah",
          name: "Sarah Jenkins",
          email: "s.jenkins@finscale.com",
          role: "Director of Customer Success",
          company: "FinScale Global",
          isExternal: true,
          avatarColor: "#38BDF8",
          initials: "SJ",
        },
        {
          id: "spk-raj",
          name: "Raj Patel",
          email: "r.patel@finscale.com",
          role: "VP of Solutions Architecture",
          company: "FinScale Global",
          isExternal: true,
          avatarColor: "#A855F7",
          initials: "RP",
        },
      ],
      meeting3Transcript
    ),
    transcript: meeting3Transcript,
    chapters: [
      {
        id: "m3-ch1",
        title: "Q3 ROI Review: 412 Calls & 3.75 Hours Saved/CSM Weekly",
        startTime: 0,
        endTime: 54,
        summary: "Sarah reports 94% seat utilization and dramatic reduction in weekly recap writing.",
      },
      {
        id: "m3-ch2",
        title: "Solutions Engineering Clip Handoffs & +25 Seat Expansion",
        startTime: 55,
        endTime: 135,
        summary: "Raj requests 25 additional seats for Solutions Architecture and Slack #customer-voice alerts.",
      },
    ],
    summariesByTemplate: createTemplateVariants(
      {
        general: {
          tldr: "FinScale Global achieved 94% utilization across 40 CSMs (412 client onboarding calls recorded, saving 3.75 hrs/week per CSM) and committed to adding 25 Solutions Engineering seats this month.",
          sections: [
            {
              id: "qbr-1",
              title: "Q3 Value Realization & ROI",
              items: [
                {
                  id: "qbr-i1",
                  text: "412 onboarding calls captured in Q3; post-call recap time dropped from 4 hours/week per CSM to 15 minutes.",
                  timestampSeconds: 0,
                  speakerName: "Sarah Jenkins",
                  badge: "94% Utilization",
                },
                {
                  id: "qbr-i2",
                  text: "Solutions Architects use 40-second highlight clips instead of watching 55-minute discovery recordings.",
                  timestampSeconds: 55,
                  speakerName: "Raj Patel",
                  badge: "Workflow Win",
                },
              ],
            },
          ],
          keyDecisions: [
            {
              id: "qbr-d1",
              decision: "Provision 25 new Solutions Engineering seats and send updated expansion order form by Friday.",
              timestampSeconds: 89,
              ownerName: "Hasnain Janjua",
              impact: "high",
            },
          ],
          followUpEmailDraft: {
            subject: "FinScale Q3 QBR Summary & +25 Solutions Engineering Seats",
            body: `Hi Sarah and Raj,\n\nThrilled to see 94% utilization and 3.75 hours saved per CSM every week! I've attached the expansion order form for the 25 Solutions Architecture seats and enabled your custom QBR template.\n\nBest,\nHasnain`,
          },
        },
      },
      meeting3Transcript,
      "FinScale Global — Q3 Customer Success QBR & 25-Seat Expansion"
    ),
    actionItems: [
      {
        id: "act-fin-1",
        meetingId: "mtg-stripe-qbr",
        meetingTitle: "FinScale Global — Q3 Customer Success QBR & 25-Seat Expansion",
        title: "Send expansion order form for 25 additional Solutions Engineering seats",
        assigneeId: "spk-hasnain",
        assigneeName: "Hasnain Janjua",
        assigneeEmail: "hasnain@fathom.video",
        assigneeCompany: "Fathom AI",
        dueDate: "Fri, Nov 6",
        completed: false,
        priority: "high",
        timestampSeconds: 116,
        syncedTo: ["hubspot", "slack"],
      },
      {
        id: "act-fin-2",
        meetingId: "mtg-stripe-qbr",
        meetingTitle: "FinScale Global — Q3 Customer Success QBR & 25-Seat Expansion",
        title: "Configure automated Slack clip routing into FinScale's #customer-voice channel",
        assigneeId: "spk-sarah",
        assigneeName: "Sarah Jenkins",
        assigneeEmail: "s.jenkins@finscale.com",
        assigneeCompany: "FinScale Global",
        dueDate: "Wed, Nov 4",
        completed: true,
        priority: "medium",
        timestampSeconds: 122,
        syncedTo: ["slack"],
      },
    ],
    highlights: [
      {
        id: "clip-finscale-roi",
        meetingId: "mtg-stripe-qbr",
        meetingTitle: "FinScale Global — Q3 Customer Success QBR & 25-Seat Expansion",
        title: "Cutting CSM Recap Time from 4 Hours to 15 Minutes Weekly",
        tag: "Positive Feedback",
        startTime: 0,
        endTime: 22,
        createdBy: "Hasnain Janjua",
        createdAt: "2026-10-30T16:10:00Z",
        shareToken: "clip-finscale-csm-roi",
        viewCount: 42,
        speakerName: "Sarah Jenkins",
        transcriptExcerpt:
          "Over the past 90 days, our Customer Success and Solutions teams recorded 412 client onboarding calls with Fathom, cutting weekly recap preparation time from 4 hours per CSM down to 15 minutes.",
      },
      {
        id: "clip-finscale-expansion",
        meetingId: "mtg-stripe-qbr",
        meetingTitle: "FinScale Global — Q3 Customer Success QBR & 25-Seat Expansion",
        title: "Why Solutions Architects Prefer 40s Clips Over 55m Recordings",
        tag: "Decision",
        startTime: 55,
        endTime: 88,
        createdBy: "Hasnain Janjua",
        createdAt: "2026-10-30T16:12:00Z",
        shareToken: "clip-finscale-25-seats",
        viewCount: 31,
        speakerName: "Raj Patel",
        transcriptExcerpt:
          "Instead of asking an engineer to watch a 55-minute discovery call, our AEs send a 40-second highlight clip of the customer explaining their API topology. We want to add 25 Solutions Engineering seats...",
      },
    ],
    metrics: computeMetricsFromTranscript(meeting3Transcript, 92),
  },
  {
    id: "mtg-eng-architecture",
    title: "Audio ML & Diarization Pipeline — Sprint Architecture Sync",
    subtitle: "3.1% WER Benchmark, Speaker Attribution & Sub-25ms Deep Search",
    category: "engineering_sync",
    platform: "teams",
    status: "completed",
    scope: "team_calls",
    visibility: "team",
    shareToken: "share-eng-diarization-sync",
    scheduledAt: "2026-10-29T17:00:00Z",
    startedAt: "2026-10-29T17:00:05Z",
    durationSeconds: 105,
    hostId: "usr-hasnain",
    hostName: "Hasnain Janjua",
    accountName: "Core AI Infrastructure",
    mediaUrl: "/media/meeting-eng-standup.wav",
    mediaType: "audio",
    isSimulatedCapture: false,
    activeTemplateId: "sprint_sync",
    participants: enrichParticipantsFromTranscript(
      [
        {
          id: "spk-hasnain",
          name: "Hasnain Janjua",
          email: "hasnain@fathom.video",
          role: "Lead Product Engineer",
          company: "Fathom AI",
          isExternal: false,
          avatarColor: "#6366F1",
          initials: "HJ",
        },
        {
          id: "spk-liam",
          name: "Liam O'Connor",
          email: "liam@fathom.video",
          role: "Senior ML Audio Engineer",
          company: "Fathom AI",
          isExternal: false,
          avatarColor: "#F97316",
          initials: "LO",
        },
        {
          id: "spk-priya",
          name: "Priya Nair",
          email: "priya@fathom.video",
          role: "Staff Backend Engineer",
          company: "Fathom AI",
          isExternal: false,
          avatarColor: "#14B8A6",
          initials: "PN",
        },
      ],
      meeting4Transcript
    ),
    transcript: meeting4Transcript,
    chapters: [
      {
        id: "m4-ch1",
        title: "Multi-Speaker Diarization & 3.1% WER Benchmark",
        startTime: 0,
        endTime: 48,
        summary: "Liam reports 97%+ speaker attribution accuracy on overlapping 6-speaker calls.",
      },
      {
        id: "m4-ch2",
        title: "Sub-25ms Global Transcript Indexing & Speaker Filters",
        startTime: 49,
        endTime: 105,
        summary: "Priya demos deep transcript search and speaker filter chips.",
      },
    ],
    summariesByTemplate: createTemplateVariants(
      {
        general: {
          tldr: "Engineering sync confirmed 3.1% word error rate (97% speaker attribution accuracy) on multi-speaker calls and sub-25ms global search across transcripts, summaries, and speakers.",
          sections: [
            {
              id: "eng-s1",
              title: "ML Diarization & Search Benchmarks",
              items: [
                {
                  id: "eng-i1",
                  text: "Word Error Rate (WER) reduced to 3.1% with 97% speaker attribution accuracy even during overlapping dialogue.",
                  timestampSeconds: 21,
                  speakerName: "Liam O'Connor",
                  badge: "3.1% WER",
                },
                {
                  id: "eng-i2",
                  text: "Global search index queries titles, speakers, summaries, and raw transcript lines in under 25ms.",
                  timestampSeconds: 49,
                  speakerName: "Priya Nair",
                  badge: "<25ms Search",
                },
              ],
            },
          ],
          keyDecisions: [
            {
              id: "eng-d1",
              decision: "Deploy speaker talk-time analytics bar and monologue metrics to production today.",
              timestampSeconds: 79,
              ownerName: "Hasnain Janjua",
              impact: "medium",
            },
          ],
          followUpEmailDraft: {
            subject: "Sprint Sync Notes: Diarization 3.1% WER & Global Search",
            body: `Team,\n\nAwesome benchmarks on the 3.1% WER and sub-25ms search index. Let's get the talk-time distribution bar deployed this afternoon.\n\nBest,\nHasnain`,
          },
        },
      },
      meeting4Transcript,
      "Audio ML & Diarization Pipeline — Sprint Architecture Sync"
    ),
    actionItems: [
      {
        id: "act-eng-1",
        meetingId: "mtg-eng-architecture",
        meetingTitle: "Audio ML & Diarization Pipeline — Sprint Architecture Sync",
        title: "Deploy speaker talk-time distribution bar and monologue detection metrics",
        assigneeId: "spk-hasnain",
        assigneeName: "Hasnain Janjua",
        assigneeEmail: "hasnain@fathom.video",
        assigneeCompany: "Fathom AI",
        dueDate: "Thu, Oct 29",
        completed: true,
        priority: "medium",
        timestampSeconds: 79,
        syncedTo: ["linear"],
      },
    ],
    highlights: [
      {
        id: "clip-eng-wer",
        meetingId: "mtg-eng-architecture",
        meetingTitle: "Audio ML & Diarization Pipeline — Sprint Architecture Sync",
        title: "Achieving 3.1% WER & 97% Multi-Speaker Diarization Accuracy",
        tag: "Key Insight",
        startTime: 21,
        endTime: 48,
        createdBy: "Priya Nair",
        createdAt: "2026-10-29T17:04:00Z",
        shareToken: "clip-eng-3-1-wer",
        viewCount: 16,
        speakerName: "Liam O'Connor",
        transcriptExcerpt:
          "Word error rate dropped to 3.1% after enabling acoustic echo cancellation and per-channel speaker diarization. Even when two participants overlap...",
      },
    ],
    metrics: computeMetricsFromTranscript(meeting4Transcript, 91),
  },
];

export const INITIAL_WORKSPACE_STATE: WorkspaceState = {
  user: {
    id: "usr-hasnain",
    name: "Hasnain Janjua",
    email: "hasnain@fathom.video",
    role: "Lead Product Engineer",
    department: "Product & Engineering",
    workspaceName: "Fathom AI Enterprise",
    workspaceDomain: "fathom.video",
    avatarInitials: "HJ",
    onboardingCompleted: true,
    isDemoMode: true,
    preferences: {
      autoRecordExternal: true,
      autoRecordInternal: true,
      defaultTemplateId: "meddpicc",
      autoSendRecapEmail: true,
      crmAutoSync: true,
      slackChannel: "#customer-voice",
      customAiInstructions:
        "Always highlight quantifiable ROI metrics, security/compliance requirements, and explicit budget or timeline commitments with clickable timestamps.",
    },
    integrations: {
      googleCalendar: {
        connected: true,
        email: "hasnain@fathom.video",
        lastSynced: "2 mins ago",
      },
      outlookCalendar: {
        connected: false,
        email: "",
      },
      slack: {
        connected: true,
        workspace: "Fathom HQ",
        channel: "#customer-voice",
      },
      hubspot: {
        connected: true,
        portalId: "HS-8841209",
        dealsSynced: 24,
      },
      salesforce: {
        connected: false,
        orgName: "",
      },
      notion: {
        connected: true,
        workspace: "Fathom Product Wiki",
        database: "Customer Research Vault",
      },
    },
  },
  meetings: INITIAL_MEETINGS,
  upcomingEvents: [
    {
      id: "up-1",
      title: "Vercel Enterprise — Technical Security & SOC2 Deep Dive",
      platform: "zoom",
      scheduledStart: "Tue, Nov 3 • 3:00 PM",
      scheduledEnd: "3:45 PM",
      durationMinutes: 45,
      accountName: "Vercel ($140k ARR)",
      autoRecordEnabled: true,
      botStatus: "joining_soon",
      templateId: "meddpicc",
      participants: [
        {
          name: "Hasnain Janjua",
          email: "hasnain@fathom.video",
          company: "Fathom AI",
          isExternal: false,
          initials: "HJ",
          avatarColor: "#6366F1",
        },
        {
          name: "Guillermo Rauch (VP Eng Sponsor)",
          email: "vp-eng@vercel-demo.com",
          company: "Vercel",
          isExternal: true,
          initials: "GR",
          avatarColor: "#00D4B2",
        },
        {
          name: "Hannah Abbott",
          email: "h.abbott@vercel-demo.com",
          company: "Vercel",
          isExternal: true,
          initials: "HA",
          avatarColor: "#F59E0B",
        },
      ],
    },
    {
      id: "up-2",
      title: "Acme Corp — 15-Seat HubSpot Sandbox Pilot Kickoff",
      platform: "google_meet",
      scheduledStart: "Wed, Nov 4 • 10:00 AM",
      scheduledEnd: "10:30 AM",
      durationMinutes: 30,
      accountName: "Acme Corp ($84k ARR)",
      autoRecordEnabled: true,
      botStatus: "ready_to_join",
      templateId: "customer_success",
      participants: [
        {
          name: "Hasnain Janjua",
          email: "hasnain@fathom.video",
          company: "Fathom AI",
          isExternal: false,
          initials: "HJ",
          avatarColor: "#6366F1",
        },
        {
          name: "Elena Rostova",
          email: "elena.rostova@acmecorp.io",
          company: "Acme Corp",
          isExternal: true,
          initials: "ER",
          avatarColor: "#00D4B2",
        },
      ],
    },
    {
      id: "up-3",
      title: "Weekly Product & Design Critique — Clip Sharing Polish",
      platform: "zoom",
      scheduledStart: "Thu, Nov 5 • 1:30 PM",
      scheduledEnd: "2:15 PM",
      durationMinutes: 45,
      accountName: "Internal Product",
      autoRecordEnabled: false,
      botStatus: "paused",
      templateId: "user_research",
      participants: [
        {
          name: "Hasnain Janjua",
          email: "hasnain@fathom.video",
          company: "Fathom AI",
          isExternal: false,
          initials: "HJ",
          avatarColor: "#6366F1",
        },
        {
          name: "Claire Moreau",
          email: "claire@fathom.video",
          company: "Fathom AI",
          isExternal: false,
          initials: "CM",
          avatarColor: "#EC4899",
        },
      ],
    },
  ],
  activities: [
    {
      id: "actv-1",
      type: "crm_synced",
      title: "Synced MEDDPICC notes & 3 action items to HubSpot",
      description: "Acme Corp ($84,000 ARR) — Deal stage updated to Technical Validation",
      timestamp: "12 mins ago",
      meetingId: "mtg-acme-discovery",
      actorName: "Fathom HubSpot Bot",
    },
    {
      id: "actv-2",
      type: "clip_shared",
      title: "Public Highlight Clip viewed 27 times",
      description: "“$84,000 Approved Q4 Budget & Nov 20 Rollout Target” shared via public link",
      timestamp: "44 mins ago",
      meetingId: "mtg-acme-discovery",
      actorName: "Elena Rostova",
    },
    {
      id: "actv-3",
      type: "summary_generated",
      title: "AI Summary generated with User Research template",
      description: "Q4 Product & UX Review — AI Summary Templates & Clip Studio",
      timestamp: "2 hours ago",
      meetingId: "mtg-linear-product",
      actorName: "Fathom AI Notetaker",
    },
    {
      id: "actv-4",
      type: "action_completed",
      title: "Completed Action Item: SOC2 Type II Packet Sent",
      description: "Delivered to Marcus Vance (Head of Security, Acme Corp)",
      timestamp: "3 hours ago",
      meetingId: "mtg-acme-discovery",
      actorName: "Hasnain Janjua",
    },
  ],
  customTemplates: [],
};
