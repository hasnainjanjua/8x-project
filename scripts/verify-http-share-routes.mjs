import assert from "node:assert/strict";

const baseUrl = process.argv[2] || "http://localhost:3099";

console.log(`================================================================================`);
console.log(`END-TO-END HTTP & MEDIA BOUNDARY VERIFICATION AGAINST: ${baseUrl}`);
console.log(`================================================================================\n`);

async function verifyTarget() {
  // 1. Test /share/clip-acme-22min-pain HTML + RSC Flight payload
  {
    const res = await fetch(`${baseUrl}/share/clip-acme-22min-pain`);
    assert.equal(res.status, 200, "Expected 200 on /share/clip-acme-22min-pain");
    const rawHtml = await res.text();
    const html = rawHtml.replaceAll("&amp;", "&").replaceAll("&#x27;", "'");

    // Must contain clip-specific content
    assert.ok(html.includes("22-Min Post-Call HubSpot Admin Drag Across 65 AEs"), "Missing clip title");
    assert.ok(html.includes("0:19") && html.includes("0:46"), "Missing clip bounds 0:19 - 0:46");
    assert.ok(html.includes("Elena Rostova"), "Missing speaker Elena Rostova");
    assert.ok(html.includes("Appreciate you setting this up"), "Missing overlapping segment m1-t2");

    // Must NOT contain any parent meeting summary, other segments, action items, or other clips
    const forbiddenStrings = [
      "Thanks for joining today, Elena and Marcus", // m1-t1 (0..18)
      "That 22-minute gap is exactly what we eliminate", // m1-t3 (47..74)
      "From an IT and InfoSec standpoint", // m1-t4 (75..108)
      "84,000 in approved Q4 budget", // m1-t5 (109..132)
      "Perfect alignment. I will send over", // m1-t6 (133..150)
      "Acme Corp — Enterprise Discovery & MEDDPICC Qualification", // Parent meeting title
      "65-Seat Revenue & Product Rollout", // Parent meeting subtitle
      "Deliver SOC2 Type II security packet", // Parent key decision / action item
      "Recap & Next Steps: Acme Corp x Fathom AI", // Follow-up email draft
      "SOC2 Type II & Unauthenticated Clip Sharing Requirement", // Other clip title
      "/media/meeting-acme-discovery.wav", // Raw full-meeting audio file path
    ];

    for (const forbidden of forbiddenStrings) {
      assert.equal(
        html.includes(forbidden),
        false,
        `/share/clip-acme-22min-pain leaked forbidden parent content: "${forbidden}"`
      );
    }
    console.log("  [PASS] GET /share/clip-acme-22min-pain HTML & RSC payload contains ONLY [19, 46] clip data and zero parent leakage");
  }

  // 2. Test /share/clip-acme-84k-budget HTML + RSC Flight payload
  {
    const res = await fetch(`${baseUrl}/share/clip-acme-84k-budget`);
    assert.equal(res.status, 200, "Expected 200 on /share/clip-acme-84k-budget");
    const rawHtml = await res.text();
    const html = rawHtml.replaceAll("&amp;", "&").replaceAll("&#x27;", "'");

    assert.ok(html.includes("$84,000 Approved Q4 Budget") || html.includes("84,000 Approved Q4 Budget"), "Missing clip title");
    assert.ok(html.includes("1:49") && html.includes("2:12"), "Missing clip bounds 1:49 - 2:12");
    assert.ok(html.includes("Elena Rostova"), "Missing speaker Elena Rostova");
    assert.ok(html.includes("If we can validate the HubSpot bi-directional sync"), "Missing overlapping segment m1-t5");

    const forbiddenStrings = [
      "Thanks for joining today, Elena and Marcus", // m1-t1 (0..18)
      "Each Account Executive spends 22 minutes after every discovery call", // m1-t2 (19..46)
      "That 22-minute gap is exactly what we eliminate", // m1-t3 (47..74)
      "From an IT and InfoSec standpoint", // m1-t4 (75..108)
      "Perfect alignment. I will send over", // m1-t6 (133..150)
      "Acme Corp — Enterprise Discovery & MEDDPICC Qualification", // Parent meeting title
      "65-Seat Revenue & Product Rollout", // Parent meeting subtitle
      "Deliver SOC2 Type II security packet", // Parent key decision / action item
      "Recap & Next Steps: Acme Corp x Fathom AI", // Follow-up email draft
      "22-Min Post-Call HubSpot Admin Drag Across 65 AEs", // Other clip title
      "/media/meeting-acme-discovery.wav", // Raw full-meeting audio file path
    ];

    for (const forbidden of forbiddenStrings) {
      assert.equal(
        html.includes(forbidden),
        false,
        `/share/clip-acme-84k-budget leaked forbidden parent content: "${forbidden}"`
      );
    }
    console.log("  [PASS] GET /share/clip-acme-84k-budget HTML & RSC payload contains ONLY [109, 132] clip data and zero parent leakage");
  }

  // 3. Test Direct URL Parameter Tampering on /share/clip-acme-22min-pain?start=0&end=150&t=0
  {
    const res = await fetch(`${baseUrl}/share/clip-acme-22min-pain?start=0&end=150&t=0&mode=meeting`);
    assert.equal(res.status, 200);
    const rawHtml = await res.text();
    const html = rawHtml.replaceAll("&amp;", "&").replaceAll("&#x27;", "'");
    assert.ok(html.includes("0:19") && html.includes("0:46"));
    assert.equal(html.includes("Thanks for joining today, Elena and Marcus"), false);
    assert.equal(html.includes("84,000 in approved Q4 budget"), false);
    console.log("  [PASS] Direct URL parameters (?start=0&end=150&t=0&mode=meeting) cannot expand clip interval or expose parent meeting");
  }

  // 4. Test Server Media Boundary Enforcement on /api/share-media/clip-acme-22min-pain and clip-acme-84k-budget
  {
    const mediaRes1 = await fetch(`${baseUrl}/api/share-media/clip-acme-22min-pain`);
    assert.equal(mediaRes1.status, 200);
    assert.equal(mediaRes1.headers.get("x-authorized-start"), "19");
    assert.equal(mediaRes1.headers.get("x-authorized-end"), "46");
    assert.equal(mediaRes1.headers.get("x-clip-duration"), "27");
    const buf1 = Buffer.from(await mediaRes1.arrayBuffer());
    // Truncated strictly at E = 46s (44 + 46 * 32000 = 1,472,044 bytes, NOT 4,800,044 bytes!)
    assert.equal(buf1.length, 44 + 46 * 32000);
    // Verify bytes 44 .. (44 + 19 * 32000) are 100% digital zero (0x00)
    let preStartNonZero = 0;
    for (let i = 44; i < 44 + 19 * 32000; i++) {
      if (buf1[i] !== 0) preStartNonZero++;
    }
    assert.equal(preStartNonZero, 0, "Expected 0 non-zero bytes before S=19s");
    // Verify [19s, 46s] contains real speech audio
    let inClipNonZero = 0;
    for (let i = 44 + 19 * 32000; i < 44 + 46 * 32000; i++) {
      if (buf1[i] !== 0) inClipNonZero++;
    }
    assert.ok(inClipNonZero > 100000, "Expected real speech signal inside [19s, 46s]");

    // Out-of-bounds query param requests on /api/share-media/clip-acme-22min-pain must return 403
    const badQuery1 = await fetch(`${baseUrl}/api/share-media/clip-acme-22min-pain?start=0&end=150`);
    assert.equal(badQuery1.status, 403);
    const badQuery2 = await fetch(`${baseUrl}/api/share-media/clip-acme-22min-pain?t=5`);
    assert.equal(badQuery2.status, 403);
    const badQuery3 = await fetch(`${baseUrl}/api/share-media/clip-acme-22min-pain?t=120`);
    assert.equal(badQuery3.status, 403);

    // Out-of-bounds HTTP Range requests (before S or after E) must return 416
    const badRangeBefore = await fetch(`${baseUrl}/api/share-media/clip-acme-22min-pain`, {
      headers: { Range: "bytes=1000-200000" },
    });
    assert.equal(badRangeBefore.status, 416);

    const badRangeAfter = await fetch(`${baseUrl}/api/share-media/clip-acme-22min-pain`, {
      headers: { Range: "bytes=2000000-3000000" },
    });
    assert.equal(badRangeAfter.status, 416);

    console.log("  [PASS] /api/share-media/clip-acme-22min-pain enforces [19, 46] byte boundaries and rejects out-of-bounds ranges/queries");
  }

  // 5. Test Custom Portable Clip Creation (POST /api/share-token) -> Fresh Resolution (/share/<c2_token>)
  {
    const postRes = await fetch(`${baseUrl}/api/share-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId: "mtg-acme-discovery",
        title: "Custom Security Clip",
        tag: "Key Insight",
        startTime: 75,
        endTime: 108,
        speakerName: "Marcus Vance",
        transcriptExcerpt: "From an IT and InfoSec standpoint, two things are non-negotiable for our Q4 rollout.",
        createdBy: "Hasnain Janjua",
      }),
    });
    assert.equal(postRes.status, 200);
    const postData = await postRes.json();
    assert.equal(postData.ok, true);
    assert.ok(postData.token.startsWith("c2_"));

    const customHtmlRes = await fetch(`${baseUrl}/share/${postData.token}`);
    assert.equal(customHtmlRes.status, 200);
    const customHtml = (await customHtmlRes.text()).replaceAll("&amp;", "&").replaceAll("&#x27;", "'");
    assert.ok(customHtml.includes("Custom Security Clip"));
    assert.ok(customHtml.includes("Marcus Vance"));
    assert.ok(customHtml.includes("1:15") && customHtml.includes("1:48"));
    assert.equal(customHtml.includes("Each Account Executive spends 22 minutes"), false);
    assert.equal(customHtml.includes("84,000 in approved Q4 budget"), false);
    console.log("  [PASS] Custom portable c2_ clip link resolves statelessly with strict [75, 108] isolation");
  }

  // 6. Test Invalid, Tampered, and Expired Tokens over HTTP
  {
    const invalidMedia = await fetch(`${baseUrl}/api/share-media/clip-invalid-12345`);
    assert.equal(invalidMedia.status, 404);

    const invalidApi = await fetch(`${baseUrl}/api/share-token?token=clip-invalid-12345`);
    assert.equal(invalidApi.status, 404);

    const invalidPage = await fetch(`${baseUrl}/share/clip-invalid-12345`);
    const invalidHtml = await invalidPage.text();
    assert.ok(invalidHtml.includes("This shared meeting or clip is unavailable"));
    console.log("  [PASS] Invalid, tampered, and expired tokens return 404 on API/media and unavailable screen on /share/[token]");
  }

  // 7. Test Full Meeting Share Still Works Normally
  {
    const mtgRes = await fetch(`${baseUrl}/share/share-acme-q4-discovery`);
    assert.equal(mtgRes.status, 200);
    const rawMtgHtml = await mtgRes.text();
    const mtgHtml = rawMtgHtml.replaceAll("&amp;", "&").replaceAll("&#x27;", "'");
    assert.ok(mtgHtml.includes("PUBLIC SHARED RECORDING"));
    assert.ok(mtgHtml.includes("Acme Corp — Enterprise Discovery & MEDDPICC Qualification"));
    assert.ok(mtgHtml.includes("Extracted Action Items"));
    console.log("  [PASS] Full meeting share (/share/share-acme-q4-discovery) works normally");
  }

  // 8. Inspect all client JS chunks referenced by /share/clip-acme-22min-pain
  {
    const htmlRes = await fetch(`${baseUrl}/share/clip-acme-22min-pain`);
    const html = await htmlRes.text();
    const scriptSrcs = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]);
    assert.ok(scriptSrcs.length > 0, "Expected Next.js client script tags");

    for (const src of scriptSrcs) {
      const jsRes = await fetch(`${baseUrl}${src}`);
      assert.equal(jsRes.status, 200);
      const jsText = await jsRes.text();
      assert.equal(
        jsText.includes("Thanks for joining today, Elena and Marcus"),
        false,
        `Client JS chunk ${src} on /share/clip-acme-22min-pain leaked seed-meetings.ts transcript!`
      );
      assert.equal(
        jsText.includes("Deliver SOC2 Type II security packet"),
        false,
        `Client JS chunk ${src} on /share/clip-acme-22min-pain leaked seed-meetings.ts summary/decisions!`
      );
    }
    console.log(`  [PASS] Inspected all ${scriptSrcs.length} client JS chunks on /share/clip-acme-22min-pain: ZERO seed-meetings leakage in client bundles`);
  }

  console.log("\nALL END-TO-END HTTP & MEDIA BOUNDARY CHECKS PASSED!");
}

verifyTarget().catch((err) => {
  console.error(err);
  process.exit(1);
});
