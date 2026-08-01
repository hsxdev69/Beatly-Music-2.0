import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    name: "Beatly Stream",
    engine: "Beatly Player",
    version: "1.0.0",
    authenticated: Boolean(process.env.YT_MUSIC_COOKIES),
    region: process.env.YT_MUSIC_GL || "IN",
    language: process.env.YT_MUSIC_HL || "en",
  });
}
