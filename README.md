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
   - **Real Playable Audio Assets**: Uses actual multi-speaker WAV audio files (`public/media/*.wav`) generated via `scripts/generate-media.mjs`—not fake static waveforms.
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
   - Extracted and manual tasks with owner attribution, due dates, priority tags, completion checkboxes, and direct timestamp jump links back to the exact moment in the call.
7. **Highlights, Clips & Unauthenticated Public Sharing (`/highlights`, `/share/[token]`)**:
   - Create custom highlight clips with category tags (*Customer Pain*, *Key Insight*, *Decision*, *Pricing Objection*, *Feature Request*, *Positive Feedback*).
   - Every meeting and clip has an unauthenticated **Public Share View** (`/share/share-acme-q4-discovery`, `/share/clip-acme-84k-budget`) accessible to logged-out visitors.
8. **Global Deep Search (`⌘K` / `Ctrl+K` & `/search`)**:
   - Instant search across meeting titles, participants, AI summaries, action items, and verbatim transcript lines.
9. **Settings, Integrations & Custom Templates (`/settings`)**:
   - Configure auto-record rules, calendar/CRM integrations (Google Calendar, Outlook, HubSpot, Slack, Notion, Salesforce), custom AI prompt instructions, and reset demo seed data.

---

## Real vs. Simulated Capabilities (Transparency Disclosure)

| Capability | Implementation Status | Details |
| :--- | :--- | :--- |
| **Audio Playback & Scrubbing** | **Real** | Uses genuine playable PCM `.wav` audio files (`public/media/*.wav`) wired to HTML5 `<audio>` with real-time `timeupdate` synchronization, `-10s/+10s` skip, and `1x–2x` speed control. |
| **Transcript & Summary Timestamp Sync** | **Real** | Clicking any summary citation, action item timestamp, chapter marker, or transcript utterance seeks the media player to that exact second. |
| **AI Summary Template Switching** | **Real (Deterministic + Custom Builder)** | All 6 specialized templates (General, MEDDPICC, CS QBR, 1-on-1, User Research, Sprint Sync) dynamically re-render structured notes, decisions, and follow-up emails. |
| **Live Zoom/Meet Recording Bot** | **Simulated (Clearly Labeled)** | Per the assignment brief, instead of dialing a headless bot into live Zoom/Meet servers, the **"Simulate Live Call"** modal (`SimulatedLiveCaptureModal`) demonstrates Fathom's in-call floating bar, live transcript streaming, and 1-click live Highlight bookmarking, then saves a playable meeting to the library. |
| **Persistence Architecture** | **Hybrid Server API + Client LocalStorage** | State mutations persist both to `PUT /api/workspace` (`.data/workspace-db.json` / `os.tmpdir()`) and client `localStorage` (`fathom_ai_workspace_v1`), ensuring evaluators on serverless deployments experience reliable persistence without cross-visitor collisions. |

---

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` (Instant Demo Access is enabled by default).
