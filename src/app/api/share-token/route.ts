import { NextRequest, NextResponse } from "next/server";
import { signPortableClipToken } from "@/lib/share-token";
import { resolvePublicShare } from "@/lib/public-share-resolver";
import { HighlightTag } from "@/types/fathom";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = signPortableClipToken({
      meetingId: String(body?.meetingId || ""),
      title: String(body?.title || ""),
      tag: body?.tag as HighlightTag,
      startTime: Number(body?.startTime),
      endTime: Number(body?.endTime),
      speakerName: String(body?.speakerName || ""),
      transcriptExcerpt: String(body?.transcriptExcerpt || ""),
      createdBy: String(body?.createdBy || "Hasnain Janjua"),
      ttlSeconds:
        body?.ttlSeconds !== undefined ? Number(body.ttlSeconds) : undefined,
    });
    return NextResponse.json({
      ok: true,
      token,
      shareUrl: `/share/${token}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Invalid clip share payload",
      },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const resolved = resolvePublicShare(token);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: "Invalid, tampered, or expired share token" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, share: resolved });
}
