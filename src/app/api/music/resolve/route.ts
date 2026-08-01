import { NextRequest, NextResponse } from "next/server";
import { resolveAlternativeCandidates } from "@/lib/ytmusic";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || "";
    const artist = searchParams.get("artist") || "";
    const exclude = searchParams.get("exclude") || undefined;

    const candidates = await resolveAlternativeCandidates(title, artist, exclude);
    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Resolve route error:", error);
    return NextResponse.json({ candidates: [] });
  }
}
