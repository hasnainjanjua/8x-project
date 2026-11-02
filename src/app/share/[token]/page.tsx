import type { Metadata } from "next";
import { verifyPortableClipToken } from "@/lib/share-token";
import { INITIAL_MEETINGS } from "@/data/seed-meetings";
import { PublicShareClient } from "@/components/share/PublicShareClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  // Check if token is a server-verified HMAC-SHA256 portable clip token
  const verifiedClip = verifyPortableClipToken(token);
  if (verifiedClip) {
    return {
      title: `Shared Highlight Clip (${verifiedClip.tag}) — Fathom AI`,
      description:
        "Listen to this shared meeting highlight clip with synchronized transcript and time-bounded playback on Fathom AI.",
    };
  }

  // Check seeded meetings & clips (avoiding exposure of private transcript/deal specifics in metadata)
  for (const m of INITIAL_MEETINGS) {
    if (m.shareToken === token || m.id === token) {
      return {
        title: "Shared Meeting Recording — Fathom AI",
        description:
          "Review this shared meeting recording with synchronized transcript and structured summary on Fathom AI.",
      };
    }
    const seededClip = m.highlights.find((h) => h.shareToken === token || h.id === token);
    if (seededClip) {
      return {
        title: `Shared Highlight Clip (${seededClip.tag}) — Fathom AI`,
        description:
          "Listen to this shared meeting highlight clip with synchronized transcript and time-bounded playback on Fathom AI.",
      };
    }
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
  const serverVerifiedClip = verifyPortableClipToken(token);

  return <PublicShareClient token={token} serverVerifiedClip={serverVerifiedClip} />;
}
