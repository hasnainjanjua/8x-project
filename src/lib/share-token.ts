import { HighlightClip, HighlightTag } from "@/types/fathom";

// Cross-Device / Fresh-Browser Self-Contained Share Token Codec:
// Encodes custom HighlightClip metadata directly into a URL-safe base64url token (`c1_<payload>`)
// with a deterministic FNV-1a integrity signature. This guarantees that newly created public clips
// open in ANY fresh browser, incognito window, or mobile device without depending on creator
// localStorage or paid external database services, while rejecting tampered/invalid tokens.

interface CompactClipPayload {
  v: 1;
  m: string; // meetingId
  t: string; // title
  g: HighlightTag; // tag
  s: number; // startTime
  e: number; // endTime
  k: string; // speakerName
  x: string; // transcriptExcerpt
  c: string; // createdBy
}

function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function toBase64Url(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = "";
  utf8Bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodePortableClipToken(params: {
  meetingId: string;
  title: string;
  tag: HighlightTag;
  startTime: number;
  endTime: number;
  speakerName: string;
  transcriptExcerpt: string;
  createdBy: string;
}): string {
  const payload: CompactClipPayload = {
    v: 1,
    m: params.meetingId,
    t: params.title.slice(0, 120),
    g: params.tag,
    s: Math.max(0, Math.floor(params.startTime)),
    e: Math.max(1, Math.floor(params.endTime)),
    k: params.speakerName.slice(0, 60),
    x: params.transcriptExcerpt.slice(0, 340),
    c: params.createdBy.slice(0, 60),
  };
  const json = JSON.stringify(payload);
  const encoded = toBase64Url(json);
  const sig = fnv1aHash(`fathom-8x-v1:${encoded}`);
  return `c1_${sig}_${encoded}`;
}

export function decodePortableClipToken(
  token: string,
  resolveMeetingTitle: (meetingId: string) => string | undefined
): HighlightClip | null {
  if (!token || !token.startsWith("c1_")) return null;
  const parts = token.split("_");
  if (parts.length < 3) return null;
  const sig = parts[1];
  const encoded = parts.slice(2).join("_");
  const expectedSig = fnv1aHash(`fathom-8x-v1:${encoded}`);
  if (sig !== expectedSig) {
    return null;
  }

  try {
    const rawJson = fromBase64Url(encoded);
    const data = JSON.parse(rawJson) as CompactClipPayload;
    if (
      data?.v !== 1 ||
      typeof data.m !== "string" ||
      typeof data.t !== "string" ||
      typeof data.s !== "number" ||
      typeof data.e !== "number"
    ) {
      return null;
    }

    const meetingTitle = resolveMeetingTitle(data.m);
    if (!meetingTitle) {
      return null;
    }

    return {
      id: `clip-portable-${sig}`,
      meetingId: data.m,
      meetingTitle,
      title: data.t,
      tag: data.g || "Key Insight",
      startTime: data.s,
      endTime: data.e,
      createdBy: data.c || "Hasnain Janjua",
      createdAt: new Date().toISOString(),
      shareToken: token,
      viewCount: 1,
      transcriptExcerpt: data.x || "",
      speakerName: data.k || "Meeting Speaker",
    };
  } catch {
    return null;
  }
}
