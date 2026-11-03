import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { resolveShareAudioSource } from "@/lib/public-share-resolver";

export const dynamic = "force-dynamic";

interface ParsedWav {
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataOffset: number;
  dataSize: number;
  buffer: Buffer;
}

function parseWavBuffer(buf: Buffer): ParsedWav {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("Invalid WAV file header");
  }
  const numChannels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const byteRate = buf.readUInt32LE(28);
  const blockAlign = buf.readUInt16LE(32);
  const bitsPerSample = buf.readUInt16LE(34);

  let offset = 12;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === "data") {
      return {
        numChannels,
        sampleRate,
        byteRate,
        blockAlign,
        bitsPerSample,
        dataOffset: offset + 8,
        dataSize: Math.min(chunkSize, buf.length - (offset + 8)),
        buffer: buf,
      };
    }
    offset += 8 + chunkSize;
  }

  throw new Error("WAV data chunk not found");
}

/**
 * Constructs a boundary-enforced WAV buffer for a shared clip or meeting:
 * - For a clip with authorized interval [S, E]:
 *   1. All audio after E (`> E * byteRate`) is physically truncated from the WAV buffer.
 *   2. All audio before S (`0 .. S * byteRate`) is overwritten with `0x00` digital silence
 *      so zero parent-meeting speech before S ever leaves the server, while keeping the
 *      native media timeline aligned with [S, E].
 */
function buildBoundedWavBuffer(
  wav: ParsedWav,
  startTimeSec: number,
  endTimeSec: number,
  isClip: boolean
): { wavBuffer: Buffer; authorizedAudioStartByte: number; authorizedAudioEndByte: number } {
  const startPcmByte = Math.max(
    0,
    Math.min(
      wav.dataSize,
      Math.floor(startTimeSec * wav.byteRate) -
        (Math.floor(startTimeSec * wav.byteRate) % wav.blockAlign)
    )
  );
  const endPcmByte = Math.max(
    startPcmByte,
    Math.min(
      wav.dataSize,
      Math.floor(endTimeSec * wav.byteRate) -
        (Math.floor(endTimeSec * wav.byteRate) % wav.blockAlign)
    )
  );

  // Truncate strictly at endPcmByte so no audio after E exists in the buffer
  const totalDataBytes = endPcmByte;
  const out = Buffer.alloc(44 + totalDataBytes);

  // Write canonical 44-byte RIFF/WAVE header
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + totalDataBytes, 4);
  out.write("WAVE", 8, "ascii");
  out.write("fmt ", 12, "ascii");
  out.writeUInt32LE(16, 16); // PCM chunk size
  out.writeUInt16LE(1, 20);  // PCM format = 1
  out.writeUInt16LE(wav.numChannels, 22);
  out.writeUInt32LE(wav.sampleRate, 24);
  out.writeUInt32LE(wav.byteRate, 28);
  out.writeUInt16LE(wav.blockAlign, 32);
  out.writeUInt16LE(wav.bitsPerSample, 34);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(totalDataBytes, 40);

  if (isClip) {
    // Bytes 44 .. (44 + startPcmByte) remain 0x00 (digital silence — zero parent speech before S).
    // Copy ONLY the authorized [S, E] PCM audio bytes into (44 + startPcmByte) .. (44 + endPcmByte).
    wav.buffer.copy(
      out,
      44 + startPcmByte,
      wav.dataOffset + startPcmByte,
      wav.dataOffset + endPcmByte
    );
  } else {
    wav.buffer.copy(out, 44, wav.dataOffset, wav.dataOffset + totalDataBytes);
  }

  return {
    wavBuffer: out,
    authorizedAudioStartByte: 44 + startPcmByte,
    authorizedAudioEndByte: 44 + endPcmByte,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const resolved = resolveShareAudioSource(token);

  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: "Invalid, tampered, or expired share token" },
      { status: 404 }
    );
  }

  const { kind, internalMediaPath, startTime: S, endTime: E } = resolved;

  // Reject any query parameter attempting to expand or access outside [S, E]
  const sp = req.nextUrl.searchParams;
  const qStart = sp.get("start") ?? sp.get("startTime") ?? sp.get("s");
  const qEnd = sp.get("end") ?? sp.get("endTime") ?? sp.get("e");
  const qTime = sp.get("t") ?? sp.get("time");

  if (kind === "clip") {
    if (qStart !== null && (!Number.isFinite(Number(qStart)) || Number(qStart) < S || Number(qStart) > E)) {
      return NextResponse.json(
        { ok: false, error: `Requested start time is outside authorized clip interval [${S}, ${E}]` },
        { status: 403 }
      );
    }
    if (qEnd !== null && (!Number.isFinite(Number(qEnd)) || Number(qEnd) > E || Number(qEnd) < S)) {
      return NextResponse.json(
        { ok: false, error: `Requested end time is outside authorized clip interval [${S}, ${E}]` },
        { status: 403 }
      );
    }
    if (qTime !== null && (!Number.isFinite(Number(qTime)) || Number(qTime) < S || Number(qTime) > E)) {
      return NextResponse.json(
        { ok: false, error: `Requested timestamp is outside authorized clip interval [${S}, ${E}]` },
        { status: 403 }
      );
    }
  }

  const relPath = internalMediaPath.replace(/^\/+/, "");
  const fullPath = path.join(process.cwd(), "public", relPath);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json(
      { ok: false, error: "Audio recording asset not found" },
      { status: 404 }
    );
  }

  const rawBuf = fs.readFileSync(fullPath);
  const parsedWav = parseWavBuffer(rawBuf);
  const { wavBuffer, authorizedAudioStartByte, authorizedAudioEndByte } =
    buildBoundedWavBuffer(parsedWav, S, E, kind === "clip");

  const totalLength = wavBuffer.length;
  const baseHeaders: Record<string, string> = {
    "Content-Type": "audio/wav",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Share-Kind": kind,
    "X-Authorized-Start": String(S),
    "X-Authorized-End": String(E),
    "X-Clip-Duration": String(E - S),
  };

  const rangeHeader = req.headers.get("range");
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
    if (!match) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes */${totalLength}`,
        },
      });
    }

    const startStr = match[1];
    const endStr = match[2];
    const rangeStart = startStr ? parseInt(startStr, 10) : 0;
    const rangeEnd = endStr ? Math.min(parseInt(endStr, 10), totalLength - 1) : totalLength - 1;

    // Reject byte ranges beyond E or non-header byte ranges strictly before S
    if (
      !Number.isFinite(rangeStart) ||
      !Number.isFinite(rangeEnd) ||
      rangeStart < 0 ||
      rangeStart >= totalLength ||
      rangeStart > rangeEnd ||
      (endStr !== "" && parseInt(endStr, 10) >= totalLength) ||
      (kind === "clip" && rangeStart >= 44 && rangeEnd < authorizedAudioStartByte) ||
      (kind === "clip" && rangeStart >= authorizedAudioEndByte)
    ) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes */${totalLength}`,
        },
      });
    }

    const chunk = wavBuffer.subarray(rangeStart, rangeEnd + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${rangeStart}-${rangeEnd}/${totalLength}`,
        "Content-Length": String(chunk.length),
      },
    });
  }

  return new NextResponse(new Uint8Array(wavBuffer), {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(totalLength),
    },
  });
}
