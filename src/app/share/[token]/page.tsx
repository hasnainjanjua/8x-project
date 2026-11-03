import type { Metadata } from "next";
import { resolvePublicShare } from "@/lib/public-share-resolver";
import { PublicShareClient } from "@/components/share/PublicShareClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const resolved = resolvePublicShare(token);

  if (resolved?.kind === "clip") {
    return {
      title: `Shared Highlight Clip (${resolved.tag}) — Fathom AI`,
      description:
        "Listen to this shared meeting highlight clip with synchronized transcript and time-bounded playback on Fathom AI.",
    };
  }

  if (resolved?.kind === "meeting") {
    return {
      title: "Shared Meeting Recording — Fathom AI",
      description:
        "Review this shared meeting recording with synchronized transcript and structured summary on Fathom AI.",
    };
  }

  return {
    title: "Shared Link Unavailable — Fathom AI",
    description: "This shared meeting or highlight clip link is invalid, expired, or unavailable.",
  };
}

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shareData = resolvePublicShare(token);

  return <PublicShareClient shareData={shareData} />;
}
