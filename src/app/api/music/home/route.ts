import { NextRequest, NextResponse } from "next/server";
import { fetchHomeFeed } from "@/lib/ytmusic";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "All";
    const seedParam = searchParams.get("seed");
    const seed = seedParam ? parseInt(seedParam, 10) || 42 : Math.floor(Math.random() * 100000);

    const homeData = await fetchHomeFeed(filter, seed);
    return NextResponse.json(homeData);
  } catch (error) {
    console.error("Home feed route error:", error);
    return NextResponse.json(
      { error: "Failed to generate home feed" },
      { status: 500 }
    );
  }
}
