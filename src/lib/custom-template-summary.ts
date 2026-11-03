import type {
  CustomSummaryTemplate,
  Meeting,
  MeetingSummary,
  SummarySection,
  SummarySectionItem,
  SummaryTemplateId,
} from "@/types/fathom";

/**
 * Deterministically generates a structured MeetingSummary for a user-created CustomSummaryTemplate
 * grounded strictly in the meeting's recorded transcript, decisions, and action items.
 */
export function buildCustomTemplateSummary(
  meeting: Meeting,
  customTemplate: CustomSummaryTemplate
): MeetingSummary {
  const baseGeneral =
    meeting.summariesByTemplate.general ||
    Object.values(meeting.summariesByTemplate)[0];

  const transcript = meeting.transcript || [];
  const configuredSections =
    customTemplate.sections && customTemplate.sections.length > 0
      ? customTemplate.sections
      : ["Executive Summary", "Key Insights & Signals", "Next Steps"];

  const instructionKeywords = customTemplate.promptInstructions
    .toLowerCase()
    .split(/[^a-z0-9$%]+/)
    .filter((w) => w.length > 3);

  // Find transcript segments that best match the custom prompt instructions
  const instructionMatchedSegments = transcript.filter((seg) =>
    instructionKeywords.some((kw) => seg.text.toLowerCase().includes(kw))
  );

  const primaryInstructionSeg =
    instructionMatchedSegments[0] || transcript[1] || transcript[0];

  const sections: SummarySection[] = configuredSections.map((secTitle, secIdx) => {
    const titleLower = secTitle.toLowerCase();
    const secKeywords = titleLower
      .split(/[^a-z0-9$%]+/)
      .filter((w) => w.length > 2);

    const items: SummarySectionItem[] = [];

    // If first section, include an explicit item addressing the custom prompt instructions
    if (secIdx === 0 && primaryInstructionSeg) {
      items.push({
        id: `${customTemplate.id}-s${secIdx}-prompt`,
        text: `[Instruction Focus: ${customTemplate.promptInstructions}] ${primaryInstructionSeg.text}`,
        timestampSeconds: primaryInstructionSeg.startTime,
        speakerName: primaryInstructionSeg.speakerName,
        badge: customTemplate.name,
      });
    }

    // Check if section is about Next Steps / Action Items
    if (
      (titleLower.includes("next") ||
        titleLower.includes("action") ||
        titleLower.includes("step") ||
        titleLower.includes("owner") ||
        titleLower.includes("follow")) &&
      meeting.actionItems.length > 0
    ) {
      for (const act of meeting.actionItems) {
        items.push({
          id: `${customTemplate.id}-s${secIdx}-act-${act.id}`,
          text: `${act.title} (Due: ${act.dueDate})`,
          timestampSeconds: act.timestampSeconds,
          speakerName: act.assigneeName,
          badge: `${act.priority.toUpperCase()} PRIORITY`,
        });
      }
    }

    // Match transcript segments relevant to this section's title keywords
    const matchedBySec = transcript.filter((seg) =>
      secKeywords.some((kw) => seg.text.toLowerCase().includes(kw))
    );

    if (matchedBySec.length > 0) {
      for (const seg of matchedBySec.slice(0, 2)) {
        if (!items.some((it) => it.timestampSeconds === seg.startTime && it.text === seg.text)) {
          items.push({
            id: `${customTemplate.id}-s${secIdx}-seg-${seg.id}`,
            text: seg.text,
            timestampSeconds: seg.startTime,
            speakerName: seg.speakerName,
            badge: secTitle,
          });
        }
      }
    }

    // Ensure every configured section has at least one grounded transcript item
    if (items.length === 0 && transcript.length > 0) {
      const fallbackSeg = transcript[secIdx % transcript.length];
      items.push({
        id: `${customTemplate.id}-s${secIdx}-fb-${fallbackSeg.id}`,
        text: fallbackSeg.text,
        timestampSeconds: fallbackSeg.startTime,
        speakerName: fallbackSeg.speakerName,
        badge: secTitle,
      });
    }

    return {
      id: `${customTemplate.id}-sec-${secIdx}`,
      title: secTitle,
      items,
    };
  });

  const sectionBulletsText = sections
    .map(
      (s) =>
        `${s.title}:\n${s.items
          .map((i) => `- ${i.text}${i.speakerName ? ` (${i.speakerName})` : ""}`)
          .join("\n")}`
    )
    .join("\n\n");

  return {
    templateId: customTemplate.id,
    templateName: customTemplate.name,
    templateBadge: "Custom AI",
    tldr: `${baseGeneral.tldr} — Formatted with custom template "${customTemplate.name}" (${customTemplate.promptInstructions}).`,
    sections,
    keyDecisions: baseGeneral.keyDecisions,
    followUpEmailDraft: {
      subject: `${customTemplate.name} — ${meeting.title}`,
      body: `Hi team,\n\nHere is the structured recap from "${meeting.title}" generated using our "${customTemplate.name}" template (${customTemplate.promptInstructions}):\n\n${sectionBulletsText}\n\nBest,\n${meeting.hostName}`,
    },
  };
}

/**
 * Resolves the active MeetingSummary for a meeting, supporting both the 6 built-in
 * templates and any user-created custom templates in WorkspaceState.
 */
export function resolveMeetingSummary(
  meeting: Meeting,
  customTemplates: CustomSummaryTemplate[] = [],
  templateIdOverride?: SummaryTemplateId
): MeetingSummary {
  const targetId = templateIdOverride || meeting.activeTemplateId;

  const customMatch = customTemplates.find((ct) => ct.id === targetId);
  if (customMatch) {
    return buildCustomTemplateSummary(meeting, customMatch);
  }

  return (
    meeting.summariesByTemplate[targetId] ||
    meeting.summariesByTemplate.general ||
    Object.values(meeting.summariesByTemplate)[0]
  );
}
