import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function createMockMp3Buffer(title: string, artist: string): Buffer {
  const header = Buffer.from([
    0x49, 0x44, 0x33, // "ID3"
    0x03, 0x00,       // version 2.3
    0x00,             // flags
    0x00, 0x00, 0x02, 0x00, // tag size (256 bytes)
  ]);

  // MPEG Frame header: 0xFF 0xFB (MPEG 1 Layer 3, 128kbps, 44100Hz, stereo)
  const mpegFrame = Buffer.alloc(417, 0x00);
  mpegFrame[0] = 0xff;
  mpegFrame[1] = 0xfb;
  mpegFrame[2] = 0x90;
  mpegFrame[3] = 0x64;

  const frames: Buffer[] = [];
  for (let i = 0; i < 400; i++) {
    const frame = Buffer.from(mpegFrame);
    for (let j = 4; j < frame.length; j++) {
      frame[j] = (Math.sin((i * 100 + j) * 0.1) * 127 + 128) & 0xff;
    }
    frames.push(frame);
  }

  return Buffer.concat([header, Buffer.alloc(256), Buffer.concat(frames)]);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    await context.params;
    const { searchParams } = new URL(request.url);
    const title = (searchParams.get("title") || "Beatly Track").replace(/[/\\?%*:|"<>]/g, "");
    const artist = (searchParams.get("artist") || "Unknown Artist").replace(/[/\\?%*:|"<>]/g, "");

    const filename = `${artist} - ${title}.mp3`;
    const mp3Buffer = createMockMp3Buffer(title, artist);
    const uint8 = new Uint8Array(mp3Buffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": uint8.byteLength.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Download route error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
