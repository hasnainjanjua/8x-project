import crypto from "node:crypto";
import { HighlightClip, HighlightTag } from "@/types/fathom";
import { INITIAL_MEETINGS } from "@/data/seed-meetings";

// Server-Only Cryptographic Share Token Module (HMAC-SHA256)
// Signs and verifies portable highlight clip tokens (`c2_<hex_hmac_sha256>_<base64url_payload>`)
// strictly on the server using `process.env.FATHOM_SHARE_SECRET`.
// The signing secret is never exposed to client-side code.

const ALLOWED_TAGS: ReadonlySet<HighlightTag> = new Set<HighlightTag>([
  "Customer Pain",
  "Key Insight",
  "Decision",
  "Pricing Objection",
  "Feature Request",
  "Positive Feedback",
]);

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const MAX_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

export interface CompactClipPayloadV2 {
  v: 2;
  m: string; // meetingId
  t: string; // title
  g: HighlightTag; // tag
  s: number; // startTime (seconds)
  e: number; // endTime (seconds)
  k: string; // speakerName
  x: string; // transcriptExcerpt
  c: string; // createdBy
  iat: number; // issued at (unix seconds)
  exp: number; // expiration (unix seconds)
}

let loggedFallbackWarning = false;

function getServerSigningKey(): Buffer {
  const envSecret = process.env.FATHOM_SHARE_SECRET;
  if (envSecret && envSecret.trim().length >= 16) {
    return crypto.createHash("sha256").update(envSecret.trim(), "utf-8").digest();
  }
  if (!loggedFallbackWarning && process.env.NODE_ENV === "production") {
    loggedFallbackWarning = true;
    console.warn(
      "[Fathom Security] FATHOM_SHARE_SECRET is not set. Using derived server-only HMAC key. Set FATHOM_SHARE_SECRET in your Vercel environment variables."
    );
  }
  const serverSeed =
    process.env.FATHOM_SHARE_SECRET ||
    process.env.VERCEL_PROJECT_ID ||
    "fathom-ai-server-hmac-sha256-default-key-v2";
  return crypto.scryptSync(serverSeed, "fathom-share-token-hmac-salt-v2", 32);
}

function computeHmacBuffer(encodedPayload: string): Buffer {
  const key = getServerSigningKey();
  return crypto
    .createHmac("sha256", key)
    .update(`c2:${encodedPayload}`, "utf-8")
    .digest();
}

export interface SignClipTokenInput {
  meetingId: string;
  title: string;
  tag: HighlightTag;
  startTime: number;
  endTime: number;
  speakerName: string;
  transcriptExcerpt: string;
  createdBy: string;
  ttlSeconds?: number;
}

export function signPortableClipToken(input: SignClipTokenInput): string {
  const meetingId = String(input.meetingId || "").trim();
  if (!/^[a-zA-Z0-9_-]{3,80}$/.test(meetingId)) {
    throw new Error("Invalid meetingId format");
  }

  const knownMeeting = INITIAL_MEETINGS.find((m) => m.id === meetingId);
  const maxAllowedDuration = knownMeeting ? knownMeeting.durationSeconds : 3600;

  const title = String(input.title || "").trim().slice(0, 120);
  const speakerName = String(input.speakerName || "").trim().slice(0, 60);
  const transcriptExcerpt = String(input.transcriptExcerpt || "").trim().slice(0, 340);
  const createdBy = String(input.createdBy || "Hasnain Janjua").trim().slice(0, 60);

  if (!title || !speakerName || !transcriptExcerpt || !createdBy) {
    throw new Error("Missing required clip fields");
  }

  if (!ALLOWED_TAGS.has(input.tag)) {
    throw new Error("Invalid highlight tag");
  }

  const startTime = Math.floor(Number(input.startTime));
  const endTime = Math.floor(Number(input.endTime));
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    startTime < 0 ||
    endTime <= startTime ||
    endTime > maxAllowedDuration
  ) {
    throw new Error(`Invalid clip time range: ${startTime}..${endTime}`);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const ttl =
    input.ttlSeconds !== undefined
      ? Math.floor(Number(input.ttlSeconds))
      : DEFAULT_TTL_SECONDS;

  const payload: CompactClipPayloadV2 = {
    v: 2,
    m: meetingId,
    t: title,
    g: input.tag,
    s: startTime,
    e: endTime,
    k: speakerName,
    x: transcriptExcerpt,
    c: createdBy,
    iat: nowSec,
    exp: nowSec + ttl,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf-8").toString(
    "base64url"
  );
  const macHex = computeHmacBuffer(encodedPayload).toString("hex");
  return `c2_${macHex}_${encodedPayload}`;
}

export function verifyPortableClipToken(token: string): HighlightClip | null {
  if (typeof token !== "string" || !token.startsWith("c2_")) {
    return null;
  }

  // Format: c2_<64_hex_chars>_<base64url_payload>
  const firstSep = token.indexOf("_");
  const secondSep = token.indexOf("_", firstSep + 1);
  if (firstSep !== 2 || secondSep !== 67) {
    return null;
  }

  const sigHex = token.slice(3, 67);
  const encodedPayload = token.slice(68);

  if (!/^[0-9a-f]{64}$/.test(sigHex) || !/^[A-Za-z0-9_-]{16,1200}$/.test(encodedPayload)) {
    return null;
  }

  const providedMac = Buffer.from(sigHex, "hex");
  const expectedMac = computeHmacBuffer(encodedPayload);
  if (
    providedMac.length !== expectedMac.length ||
    !crypto.timingSafeEqual(providedMac, expectedMac)
  ) {
    return null;
  }

  try {
    const rawJson = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const data = JSON.parse(rawJson) as Partial<CompactClipPayloadV2>;

    if (
      !data ||
      data.v !== 2 ||
      typeof data.m !== "string" ||
      typeof data.t !== "string" ||
      typeof data.g !== "string" ||
      typeof data.s !== "number" ||
      typeof data.e !== "number" ||
      typeof data.k !== "string" ||
      typeof data.x !== "string" ||
      typeof data.c !== "string" ||
      typeof data.iat !== "number" ||
      typeof data.exp !== "number"
    ) {
      return null;
    }

    if (!/^[a-zA-Z0-9_-]{3,80}$/.test(data.m)) return null;
    if (data.t.trim().length < 1 || data.t.length > 120) return null;
    if (!ALLOWED_TAGS.has(data.g as HighlightTag)) return null;
    if (data.k.trim().length < 1 || data.k.length > 60) return null;
    if (data.x.trim().length < 1 || data.x.length > 340) return null;
    if (data.c.trim().length < 1 || data.c.length > 60) return null;

    if (
      !Number.isInteger(data.s) ||
      !Number.isInteger(data.e) ||
      data.s < 0 ||
      data.e <= data.s ||
      data.e - data.s > 600
    ) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (
      !Number.isInteger(data.iat) ||
      !Number.isInteger(data.exp) ||
      data.exp <= data.iat ||
      data.exp - data.iat > MAX_TTL_SECONDS ||
      data.iat > nowSec + 300 ||
      nowSec > data.exp
    ) {
      return null;
    }

    const parentMeeting = INITIAL_MEETINGS.find((m) => m.id === data.m);
    if (!parentMeeting || data.e > parentMeeting.durationSeconds) {
      return null;
    }

    return {
      id: `clip-portable-${sigHex.slice(0, 12)}`,
      meetingId: parentMeeting.id,
      meetingTitle: parentMeeting.title,
      title: data.t.trim(),
      tag: data.g as HighlightTag,
      startTime: data.s,
      endTime: data.e,
      createdBy: data.c.trim(),
      createdAt: new Date(data.iat * 1000).toISOString(),
      shareToken: token,
      viewCount: 1,
      speakerName: data.k.trim(),
      transcriptExcerpt: data.x.trim(),
    };
  } catch {
    return null;
  }
}
