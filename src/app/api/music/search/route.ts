import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/ytmusic";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().slice(0, 100);

    if (q.length < 2) {
      return NextResponse.json({
        songs: [],
        albums: [],
        artists: [],
        suggestions: [],
        source: "empty",
      });
    }

    const results = await searchCatalog(q);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search route error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
