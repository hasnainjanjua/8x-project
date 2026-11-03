import assert from "node:assert/strict";
import { resolvePublicShare, resolveShareAudioSource } from "../src/lib/public-share-resolver.ts";
import { signPortableClipToken, verifyPortableClipToken } from "../src/lib/share-token.ts";
import { INITIAL_MEETINGS } from "../src/data/seed-meetings.ts";

console.log("================================================================================");
console.log("8X FATHOM AI — PUBLIC CLIP ISOLATION & SECURITY REGRESSION TEST SUITE");
console.log("================================================================================\n");

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const ALLOWED_CLIP_KEYS = new Set([
  "kind",
  "clipId",
  "shareToken",
  "title",
  "tag",
  "startTime",
  "endTime",
  "durationSeconds",
  "speakerName",
  "speakers",
  "transcriptExcerpt",
  "mediaUrl",
  "transcript",
]);

const FORBIDDEN_PARENT_KEYS = [
  "meeting",
  "meetingId",
  "meetingTitle",
  "subtitle",
  "summariesByTemplate",
  "summary",
  "actionItems",
  "highlights",
  "hostId",
  "hostName",
  "scheduledAt",
  "startedAt",
  "accountName",
  "dealValue",
  "dealStage",
  "participants",
  "chapters",
  "metrics",
];

// 1. Confirmed Reproduction #1: /share/clip-acme-22min-pain
test("Reproduction #1 (/share/clip-acme-22min-pain): exposes ONLY [19, 46] clip data and zero parent meeting data", () => {
  const res = resolvePublicShare("clip-acme-22min-pain");
  assert.ok(res, "Expected clip-acme-22min-pain to resolve");
  assert.equal(res.kind, "clip");
  assert.equal(res.title, "22-Min Post-Call HubSpot Admin Drag Across 65 AEs");
  assert.equal(res.startTime, 19);
  assert.equal(res.endTime, 46);
  assert.equal(res.durationSeconds, 27);
  assert.equal(res.speakerName, "Elena Rostova");
  assert.deepEqual(res.speakers, ["Elena Rostova"]);
  assert.equal(res.mediaUrl, "/api/share-media/clip-acme-22min-pain");

  for (const key of Object.keys(res)) {
    assert.ok(ALLOWED_CLIP_KEYS.has(key), `Unexpected key on PublicClipShareView: ${key}`);
  }
  for (const forbidden of FORBIDDEN_PARENT_KEYS) {
    assert.equal(forbidden in res, false, `Forbidden parent key '${forbidden}' present on clip view`);
  }

  // Only segment m1-t2 (19..46) overlaps [19, 46]
  assert.equal(res.transcript.length, 1);
  assert.equal(res.transcript[0].id, "m1-t2");
  assert.equal(res.transcript[0].speakerName, "Elena Rostova");
  assert.equal(res.transcript[0].startTime, 19);
  assert.equal(res.transcript[0].endTime, 46);

  const serialized = JSON.stringify(res);
  // Must NOT contain any non-overlapping transcript text, summary, action items, or other clips
  assert.equal(serialized.includes("Thanks for joining today"), false, "Leaked m1-t1");
  assert.equal(serialized.includes("That 22-minute gap is exactly what we eliminate"), false, "Leaked m1-t3");
  assert.equal(serialized.includes("From an IT and InfoSec standpoint"), false, "Leaked m1-t4");
  assert.equal(serialized.includes("$84,000 in approved Q4 budget"), false, "Leaked m1-t5");
  assert.equal(serialized.includes("Perfect alignment. I will send over"), false, "Leaked m1-t6");
  assert.equal(serialized.includes("MEDDPICC"), false, "Leaked parent meeting summary/title");
  assert.equal(serialized.includes("Send SOC2 Type II certification packet"), false, "Leaked action items");
  assert.equal(serialized.includes("meeting-acme-discovery.wav"), false, "Leaked raw full-meeting WAV path");
});

// 2. Confirmed Reproduction #2: /share/clip-acme-84k-budget
test("Reproduction #2 (/share/clip-acme-84k-budget): exposes ONLY [109, 132] clip data and zero parent meeting data", () => {
  const res = resolvePublicShare("clip-acme-84k-budget");
  assert.ok(res, "Expected clip-acme-84k-budget to resolve");
  assert.equal(res.kind, "clip");
  assert.equal(res.title, "$84,000 Approved Q4 Budget & Nov 20 Rollout Target");
  assert.equal(res.startTime, 109);
  assert.equal(res.endTime, 132);
  assert.equal(res.durationSeconds, 23);
  assert.equal(res.speakerName, "Elena Rostova");
  assert.deepEqual(res.speakers, ["Elena Rostova"]);
  assert.equal(res.mediaUrl, "/api/share-media/clip-acme-84k-budget");

  for (const key of Object.keys(res)) {
    assert.ok(ALLOWED_CLIP_KEYS.has(key), `Unexpected key on PublicClipShareView: ${key}`);
  }
  for (const forbidden of FORBIDDEN_PARENT_KEYS) {
    assert.equal(forbidden in res, false, `Forbidden parent key '${forbidden}' present on clip view`);
  }

  // Only segment m1-t5 (109..132) overlaps [109, 132]
  assert.equal(res.transcript.length, 1);
  assert.equal(res.transcript[0].id, "m1-t5");
  assert.equal(res.transcript[0].speakerName, "Elena Rostova");
  assert.equal(res.transcript[0].startTime, 109);
  assert.equal(res.transcript[0].endTime, 132);

  const serialized = JSON.stringify(res);
  assert.equal(serialized.includes("Thanks for joining today"), false, "Leaked m1-t1");
  assert.equal(serialized.includes("22 minutes after every discovery call"), false, "Leaked m1-t2");
  assert.equal(serialized.includes("That 22-minute gap is exactly what we eliminate"), false, "Leaked m1-t3");
  assert.equal(serialized.includes("From an IT and InfoSec standpoint"), false, "Leaked m1-t4");
  assert.equal(serialized.includes("Perfect alignment. I will send over"), false, "Leaked m1-t6");
  assert.equal(serialized.includes("MEDDPICC"), false, "Leaked parent meeting summary/title");
  assert.equal(serialized.includes("Send SOC2 Type II certification packet"), false, "Leaked action items");
  assert.equal(serialized.includes("meeting-acme-discovery.wav"), false, "Leaked raw full-meeting WAV path");
});

// 3. All 8 seeded clips across all 4 meetings strictly isolate their interval
test("All 8 seeded highlight clips across all 4 meetings isolate [S, E] and exclude parent data", () => {
  const allSeededClips = INITIAL_MEETINGS.flatMap((m) =>
    m.highlights.map((h) => ({ clip: h, meeting: m }))
  );
  assert.equal(allSeededClips.length, 8);

  for (const { clip, meeting } of allSeededClips) {
    const res = resolvePublicShare(clip.shareToken);
    assert.ok(res && res.kind === "clip", `Clip ${clip.shareToken} failed to resolve`);
    assert.equal(res.startTime, clip.startTime);
    assert.equal(res.endTime, clip.endTime);
    assert.ok(res.transcript.length >= 1);

    for (const seg of res.transcript) {
      assert.ok(seg.startTime >= clip.startTime, `Segment ${seg.id} startTime < clip.startTime`);
      assert.ok(seg.endTime <= clip.endTime, `Segment ${seg.id} endTime > clip.endTime`);
    }

    const nonOverlapping = meeting.transcript.filter(
      (s) => s.endTime <= clip.startTime || s.startTime >= clip.endTime
    );
    const serialized = JSON.stringify(res);
    for (const outsider of nonOverlapping) {
      assert.equal(
        serialized.includes(outsider.text),
        false,
        `Clip ${clip.shareToken} leaked non-overlapping segment ${outsider.id}`
      );
    }
  }
});

// 4. Invalid, Tampered, Expired, and Browser-Local Tokens
test("Invalid tokens return null on both share resolver and audio source resolver", () => {
  for (const invalid of [
    "",
    "invalid-token-xyz",
    "clip-nonexistent",
    "clip-1762099999999",
    "mtg-sim-1762099999999-clip-local",
    "c1_legacy_token_rejected",
    "c2_badformat",
  ]) {
    assert.equal(resolvePublicShare(invalid), null, `Expected null for ${invalid}`);
    assert.equal(resolveShareAudioSource(invalid), null, `Expected null audio source for ${invalid}`);
  }
});

test("Tampered HMAC-SHA256 portable clip tokens (modified signature or modified start/end payload) are rejected", () => {
  const validToken = signPortableClipToken({
    meetingId: "mtg-acme-discovery",
    title: "Hasnain on HubSpot Sync",
    tag: "Key Insight",
    startTime: 47,
    endTime: 74,
    speakerName: "Hasnain Janjua",
    transcriptExcerpt: "That 22-minute gap is exactly what we eliminate.",
    createdBy: "Hasnain Janjua",
  });

  // Verify valid token works first
  const validResolved = resolvePublicShare(validToken);
  assert.ok(validResolved && validResolved.kind === "clip");
  assert.equal(validResolved.startTime, 47);
  assert.equal(validResolved.endTime, 74);
  assert.equal(validResolved.transcript.length, 1);
  assert.equal(validResolved.transcript[0].id, "m1-t3");

  // 1) Tamper with HMAC signature
  const flippedChar = validToken[5] === "a" ? "b" : "a";
  const badSigToken = validToken.slice(0, 5) + flippedChar + validToken.slice(6);
  assert.equal(verifyPortableClipToken(badSigToken), null);
  assert.equal(resolvePublicShare(badSigToken), null);
  assert.equal(resolveShareAudioSource(badSigToken), null);

  // 2) Tamper with payload to expand [s, e] from [47, 74] to [0, 150] while keeping signature
  const parts = validToken.split("_");
  const decodedPayload = JSON.parse(Buffer.from(parts[2], "base64url").toString("utf-8"));
  decodedPayload.s = 0;
  decodedPayload.e = 150;
  const tamperedPayloadB64 = Buffer.from(JSON.stringify(decodedPayload), "utf-8").toString("base64url");
  const expandedRangeToken = `c2_${parts[1]}_${tamperedPayloadB64}`;
  assert.equal(verifyPortableClipToken(expandedRangeToken), null);
  assert.equal(resolvePublicShare(expandedRangeToken), null);
  assert.equal(resolveShareAudioSource(expandedRangeToken), null);
});

test("Expired portable clip tokens are rejected", () => {
  const expiredToken = signPortableClipToken({
    meetingId: "mtg-acme-discovery",
    title: "Expired Clip",
    tag: "Decision",
    startTime: 19,
    endTime: 46,
    speakerName: "Elena Rostova",
    transcriptExcerpt: "Each Account Executive spends 22 minutes...",
    createdBy: "Hasnain Janjua",
    ttlSeconds: -30,
  });

  assert.equal(verifyPortableClipToken(expiredToken), null);
  assert.equal(resolvePublicShare(expiredToken), null);
  assert.equal(resolveShareAudioSource(expiredToken), null);
});

test("Modified/out-of-bounds start and end values are rejected when signing tokens", () => {
  assert.throws(() =>
    signPortableClipToken({
      meetingId: "mtg-acme-discovery",
      title: "Negative Start",
      tag: "Decision",
      startTime: -5,
      endTime: 46,
      speakerName: "Elena Rostova",
      transcriptExcerpt: "Test",
      createdBy: "Hasnain Janjua",
    })
  );

  assert.throws(() =>
    signPortableClipToken({
      meetingId: "mtg-acme-discovery",
      title: "End Beyond Meeting Duration (150s)",
      tag: "Decision",
      startTime: 19,
      endTime: 300,
      speakerName: "Elena Rostova",
      transcriptExcerpt: "Test",
      createdBy: "Hasnain Janjua",
    })
  );

  assert.throws(() =>
    signPortableClipToken({
      meetingId: "mtg-acme-discovery",
      title: "Inverted Interval",
      tag: "Decision",
      startTime: 60,
      endTime: 30,
      speakerName: "Elena Rostova",
      transcriptExcerpt: "Test",
      createdBy: "Hasnain Janjua",
    })
  );
});

// 5. Custom Clip Persistence on both Seeded & Simulated Meetings (Stateless Cold Start)
test("Custom clip links (including sub-segment intervals and simulated calls) resolve statelessly across cold starts", () => {
  // Sub-segment custom clip [55, 70] inside m1-t3 (47..74)
  const subSegToken = signPortableClipToken({
    meetingId: "mtg-acme-discovery",
    title: "Custom Sub-Segment Clip",
    tag: "Key Insight",
    startTime: 55,
    endTime: 70,
    speakerName: "Hasnain Janjua",
    transcriptExcerpt: "That 22-minute gap is exactly what we eliminate.",
    createdBy: "Hasnain Janjua",
  });
  const subRes = resolvePublicShare(subSegToken);
  assert.ok(subRes && subRes.kind === "clip");
  assert.equal(subRes.startTime, 55);
  assert.equal(subRes.endTime, 70);
  assert.equal(subRes.durationSeconds, 15);
  assert.equal(subRes.transcript.length, 1);
  // Clamped to [55, 70] so parent segment's 47..74 boundaries are not exposed
  assert.equal(subRes.transcript[0].startTime, 55);
  assert.equal(subRes.transcript[0].endTime, 70);

  // Simulated meeting custom clip (mtg-sim-* normalized to mtg-cloudnova-sim)
  const simClipToken = signPortableClipToken({
    meetingId: "mtg-sim-1762055555555",
    title: "CloudNova 30-Seat Trial Clip",
    tag: "Decision",
    startTime: 75,
    endTime: 100,
    speakerName: "Jordan Taylor",
    transcriptExcerpt: "That solves our sprint handoff bottleneck.",
    createdBy: "Hasnain Janjua",
  });
  const simRes = resolvePublicShare(simClipToken);
  assert.ok(simRes && simRes.kind === "clip");
  assert.equal(simRes.startTime, 75);
  assert.equal(simRes.endTime, 100);
  assert.equal(simRes.speakerName, "Jordan Taylor");
  assert.equal(simRes.transcript.length, 1);
  assert.equal(simRes.transcript[0].id, "sim-seg-3");
});

// 6. Full Meeting Share Still Works Normally
test("Full meeting share links (/share/share-acme-q4-discovery) still resolve with kind='meeting' and full details", () => {
  const mtgRes = resolvePublicShare("share-acme-q4-discovery");
  assert.ok(mtgRes, "Expected full meeting share token to resolve");
  assert.equal(mtgRes.kind, "meeting");
  assert.equal(mtgRes.meetingId, "mtg-acme-discovery");
  assert.equal(mtgRes.durationSeconds, 150);
  assert.equal(mtgRes.transcript.length, 6);
  assert.ok(mtgRes.summary.tldr.length > 20);
  assert.equal(mtgRes.actionItems.length, 3);
});

console.log(`\nALL ${passed} PUBLIC CLIP ISOLATION UNIT/INTEGRATION TESTS PASSED!\n`);
