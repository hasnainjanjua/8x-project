# Fathom AI Rebuild — 8x Product Engineering Assignment

A high-craft, full-stack reconstruction of **Fathom AI** (`fathom.video`) built with **Next.js 15 (App Router, TypeScript)** and **Tailwind CSS** for the 8x Product Engineering Assignment.

- **Author / GitHub Handle**: `hasnainjanjua`
- **IDE & Agent Capture**: Google Antigravity + automated lifecycle hooks (`.agents/hooks.json` & `.agents/capture.py`) logging verbatim prompts and final responses to `.agent-logs/`.
- **Capture Verification Report**: See [`CAPTURE-TEST.md`](file:///d:/MEGAPROJECT/8x-project/CAPTURE-TEST.md).

---

## Core Product Workflows Implemented

1. **Instant Demo Access & Onboarding / Calendar Connection (`/`, `/login`)**:
   - Logged-out evaluators immediately enter a pre-populated Enterprise workspace without friction, or can test the Sign-In / Sign-Up & 3-Step Onboarding Wizard (Google Calendar / Outlook auto-join rules, default AI template framework, workspace role).
2. **Dashboard & Scheduled Bot Rules (`/`)**:
   - Meeting KPIs, Recent Recorded Calls with AI TL;DR previews, Upcoming Calendar Events with one-click **Bot Auto-Join** toggles, Priority Action Items, and Live Workspace Activity feed.
3. **Meetings Library (`/meetings`)**:
   - Filter across *All Calls*, *My Calls*, *Team Calls*, and *External Customer Calls*, plus platform (`Zoom`, `Google Meet`, `Teams`), category, and keyword search. Displays visual multi-participant talk-time ratio bars.
4. **Recording Studio & Synchronized Transcript (`/meetings/[id]`)**:
   - **Real Multi-Speaker Spoken English Audio Assets**: Uses actual spoken English multi-speaker WAV recordings (`public/media/*.wav`, 16kHz 16-bit Mono PCM) synthesized with 3 distinct Windows OneCore voices (`Microsoft David`, `Microsoft Zira`, `Microsoft Mark`) via `scripts/generate-speech-audio.ps1` and `scripts/generate-media.mjs`—aligned to each speaker turn and timestamp in the meeting transcripts.
   - **Bidirectional Timestamp Sync**: Playing audio highlights the active speaker tile and current transcript block; clicking any transcript line, chapter pill, or AI summary timestamp badge (`▶ 01:15`) immediately seeks the HTML5 audio player.
   - **Transcript Controls**: Search within transcript, filter by individual speaker, inline-edit transcript utterances, and create shareable highlight clips from any segment.
5. **Switchable AI Summary Templates (`/meetings/[id]`)**:
   - Switch instantaneously across 6 structured frameworks:
     - *General / Enhanced Summary*
     - *Sales Discovery (MEDDPICC)*
     - *Customer Success / QBR*
     - *1-on-1 Check-in*
     - *Product Feedback & User Research*
     - *Engineering & Architecture Sync*
   - Includes **Ask Fathom AI** (contextual Q&A citing exact transcript timestamps) and **Automated Follow-Up Email Drafts**.
6. **Action Items Hub (`/action-items`)**:
   - Extracted and manual tasks with inline task editing (`title`, `owner`, `dueDate`, `priority`), completion checkboxes, and direct timestamp jump links back to the exact moment in the call.
7. **Highlights, Clips & Cross-Browser Public Sharing (`/highlights`, `/share/[token]`)**:
   - Create custom highlight clips with category tags (*Customer Pain*, *Key Insight*, *Decision*, *Pricing Objection*, *Feature Request*, *Positive Feedback*).
   - Every seeded meeting, seeded clip, and **newly created custom clip** generates a server-signed portable share token (`c2_<hmac_sha256_hex>_<base64url>` signed via `/api/share-token` and verified in `src/lib/share-token.ts` using `node:crypto` HMAC-SHA256) so custom clip links work in any fresh browser, incognito window, or external device without requiring authentication or external database credentials. Invalid, tampered, or expired tokens are rejected and render an explicit unavailable state.
8. **Global Deep Search (`⌘K` / `Ctrl+K` & `/search`)**:
   - Instant search across meeting titles, participants, AI summaries, action items, and verbatim transcript lines.
9. **Settings, Integrations, Safe Simulation Cleanup & Custom Templates (`/settings`)**:
   - Configure auto-record rules, calendar/CRM integrations (Google Calendar, Outlook, HubSpot, Slack, Notion, Salesforce), and custom AI prompt instructions.
   - Provides **non-destructive Simulated Call Cleanup** (removes `mtg-sim-*` test sessions while preserving the 4 seeded meetings and all user edits) alongside a confirmation-guarded **Full Factory Reset**.

---

## Real vs. Simulated Capabilities (Transparency Disclosure)

| Capability | Implementation Status | Details |
| :--- | :--- | :--- |
| **Multi-Speaker Speech Audio & Scrubbing** | **Real** | Uses genuine spoken English `.wav` recordings (`public/media/*.wav`) with 3 distinct human TTS voices (`David`, `Zira`, `Mark`) matched to the transcript speakers and timestamps, wired to HTML5 `<audio>` with real-time `timeupdate` synchronization, `-10s/+10s` skip, and `1x–2x` speed control. |
| **Transcript & Summary Timestamp Sync** | **Real** | Clicking any summary citation, action item timestamp, chapter marker, or transcript utterance seeks the media player to that exact second. |
| **AI Summary Template Switching** | **Real (Deterministic + Custom Builder)** | All 6 specialized templates (General, MEDDPICC, CS QBR, 1-on-1, User Research, Sprint Sync) dynamically format structured notes, decisions, and follow-up emails grounded directly in each meeting's transcript. |
| **Live Zoom/Meet Recording Bot** | **Simulated (Clearly Labeled + Safely Removable)** | Per the assignment brief, instead of dialing a headless bot into live Zoom/Meet servers, the **"Simulate Live Call"** modal (`SimulatedLiveCaptureModal`) demonstrates Fathom's in-call floating bar, live transcript streaming, and 1-click live Highlight bookmarking, then saves a playable meeting that can be removed anytime via **"Clean Up Simulated Calls"**. |
| **Persistence & Public Clip Sharing** | **Server-Signed HMAC-SHA256 Share Tokens + Workspace State** | Workspace mutations persist to `PUT /api/workspace` and client `localStorage` (`fathom_ai_workspace_v1`). Custom highlight clips are signed on the server via `POST /api/share-token` (`c2_<hmac_sha256>_<base64url>`) using `FATHOM_SHARE_SECRET` so newly created clip links resolve and play in any external browser or device across Vercel serverless cold starts while rejecting forged or tampered payloads. |

---

## Environment Variables

Configure the following server-side environment variable in `.env.local` and in your Vercel Project Settings (`Settings -> Environment Variables`):

```bash
# Required in production for server-side HMAC-SHA256 signing of portable /share/c2_... clip links.
# Never prefix with NEXT_PUBLIC_ so it remains strictly server-only.
FATHOM_SHARE_SECRET=replace-with-32-byte-random-hex-secret
```

See [`.env.example`](file:///d:/MEGAPROJECT/8x-project/.env.example) for details.

---

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` (Instant Demo Access is enabled by default).
