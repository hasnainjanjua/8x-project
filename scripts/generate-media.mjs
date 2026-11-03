// Canonical multi-speaker TTS audio generator wrapper.
// Invokes scripts/generate-speech-audio.ps1, which enforces a deterministic,
// immutable speaker-to-voice registry ($SpeakerVoiceRegistry) keyed strictly
// by stable speakerId across all seeded and simulated meetings:
//   - spk-hasnain  (Hasnain Janjua) -> Microsoft David (Male)
//   - spk-elena    (Elena Rostova)  -> Microsoft Zira  (Female)
//   - spk-marcus   (Marcus Vance)   -> Microsoft Mark  (Male)
//   - spk-claire   (Claire Moreau)  -> Microsoft Zira  (Female)
//   - spk-devon    (Devon Brooks)   -> Microsoft Mark  (Male)
//   - spk-sarah    (Sarah Jenkins)  -> Microsoft Zira  (Female)
//   - spk-raj      (Raj Patel)      -> Microsoft Mark  (Male)
//   - spk-liam     (Liam O'Connor)  -> Microsoft Mark  (Male)
//   - spk-priya    (Priya Nair)     -> Microsoft Zira  (Female)
//   - spk-prospect (Jordan Taylor)  -> Microsoft Mark  (Male)
import { execSync } from "child_process";

console.log("Running scripts/generate-speech-audio.ps1 to generate validated multi-speaker speech WAVs...");
execSync("powershell -ExecutionPolicy Bypass -File scripts/generate-speech-audio.ps1", {
  stdio: "inherit",
});

