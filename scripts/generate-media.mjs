// Deprecated fake sine-wave generator replaced by scripts/generate-speech-audio.ps1
// which uses Windows WinRT SpeechSynthesizer (Microsoft David, Microsoft Zira, Microsoft Mark)
// to synthesize real, intelligible multi-speaker human speech aligned to exact transcript timestamps.
import { execSync } from "child_process";

console.log("Running scripts/generate-speech-audio.ps1 to generate multi-speaker speech WAVs...");
execSync("powershell -ExecutionPolicy Bypass -File scripts/generate-speech-audio.ps1", {
  stdio: "inherit",
});
