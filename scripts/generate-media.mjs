import fs from "fs";
import path from "path";

// Generates real playable WAV audio files with distinct multi-speaker voice cadence
// so HTML5 <audio> elements play genuine sound with accurate duration, scrubbing, and timestamps.

const outDir = path.join(process.cwd(), "public", "media");
fs.mkdirSync(outDir, { recursive: true });

function generateMeetingWav(filename, durationSec, speakerSegments) {
  const sampleRate = 16000;
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // AudioFormat PCM = 1
  buffer.writeUInt16LE(1, 22); // Mono = 1
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Find active speaker segment
    let seg = speakerSegments.find((s) => t >= s.start && t < s.end);
    if (!seg) {
      // Subtle room tone
      const roomNoise = (Math.sin(t * 120) * 0.004) * 32767;
      buffer.writeInt16LE(Math.round(roomNoise), 44 + i * 2);
      continue;
    }

    // Create natural syllable cadence (3.5 to 5.5 syllables per second with pauses)
    const relT = t - seg.start;
    const syllableGate =
      Math.max(0, Math.sin(relT * 2 * Math.PI * 4.2)) *
      (0.5 + 0.5 * Math.cos(relT * 2 * Math.PI * 0.85));

    // Pitch contour modulation
    const f0 = seg.pitch * (1 + 0.08 * Math.sin(relT * 2 * Math.PI * 1.4));
    // Formant-like harmonics for warm vocal timbre
    const wave =
      0.55 * Math.sin(2 * Math.PI * f0 * t) +
      0.28 * Math.sin(2 * Math.PI * f0 * 2 * t) +
      0.12 * Math.sin(2 * Math.PI * f0 * 3 * t) +
      0.05 * Math.sin(2 * Math.PI * (f0 * 4.5) * t);

    const sampleVal = Math.max(-1, Math.min(1, wave * syllableGate * 0.28));
    buffer.writeInt16LE(Math.round(sampleVal * 32767), 44 + i * 2);
  }

  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated ${filePath} (${durationSec}s, ${(buffer.length / 1024).toFixed(1)} KB)`);
}

// Generate 4 distinct meeting audio recordings (120s to 180s real playable duration)
generateMeetingWav("meeting-acme-discovery.wav", 150, [
  { start: 0, end: 18, pitch: 135 },
  { start: 18.5, end: 46, pitch: 195 },
  { start: 46.5, end: 74, pitch: 135 },
  { start: 74.5, end: 108, pitch: 165 },
  { start: 108.5, end: 132, pitch: 195 },
  { start: 132.5, end: 150, pitch: 135 },
]);

generateMeetingWav("meeting-stripe-qbr.wav", 135, [
  { start: 0, end: 22, pitch: 185 },
  { start: 22.5, end: 54, pitch: 125 },
  { start: 54.5, end: 88, pitch: 210 },
  { start: 88.5, end: 115, pitch: 125 },
  { start: 115.5, end: 135, pitch: 185 },
]);

generateMeetingWav("meeting-product-design.wav", 120, [
  { start: 0, end: 24, pitch: 145 },
  { start: 24.5, end: 52, pitch: 205 },
  { start: 52.5, end: 85, pitch: 160 },
  { start: 85.5, end: 120, pitch: 145 },
]);

generateMeetingWav("meeting-eng-standup.wav", 105, [
  { start: 0, end: 20, pitch: 130 },
  { start: 20.5, end: 48, pitch: 175 },
  { start: 48.5, end: 78, pitch: 150 },
  { start: 78.5, end: 105, pitch: 130 },
]);
