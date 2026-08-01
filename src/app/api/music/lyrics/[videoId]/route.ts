import { NextRequest, NextResponse } from "next/server";
import { fetchLyricsAndUpNext } from "@/lib/ytmusic";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await context.params;

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    const data = await fetchLyricsAndUpNext(videoId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Lyrics route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lyrics" },
      { status: 500 }
    );
  }
}
