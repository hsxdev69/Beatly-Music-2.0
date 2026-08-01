import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { savedTracks, listeningHistory } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");
    const collection = searchParams.get("collection");
    const summary = searchParams.get("summary");

    if (summary === "true") {
      const likedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(savedTracks)
        .where(eq(savedTracks.collection, "liked"));

      const downloadedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(savedTracks)
        .where(eq(savedTracks.collection, "downloaded"));

      const cachedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(savedTracks)
        .where(eq(savedTracks.collection, "cached"));

      const historyCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(listeningHistory);

      return NextResponse.json({
        liked: Number(likedCount[0]?.count || 0),
        downloaded: Number(downloadedCount[0]?.count || 0),
        cached: Number(cachedCount[0]?.count || 0),
        history: Number(historyCount[0]?.count || 0),
      });
    }

    if (view === "history") {
      const history = await db
        .select()
        .from(listeningHistory)
        .orderBy(desc(listeningHistory.playedAt))
        .limit(50);
      return NextResponse.json({ items: history });
    }

    if (collection) {
      const tracks = await db
        .select()
        .from(savedTracks)
        .where(eq(savedTracks.collection, collection))
        .orderBy(desc(savedTracks.createdAt));
      return NextResponse.json({ items: tracks });
    }

    // All saved tracks grouped
    const allTracks = await db
      .select()
      .from(savedTracks)
      .orderBy(desc(savedTracks.createdAt));

    return NextResponse.json({ items: allTracks });
  } catch (error) {
    console.error("Library GET error:", error);
    return NextResponse.json({ items: [], error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, videoId, collection = "liked", title, artist, album, duration, image, color } = body;

    if (!videoId || !title || !artist) {
      return NextResponse.json({ error: "Missing required track details" }, { status: 400 });
    }

    if (type === "history") {
      const [inserted] = await db
        .insert(listeningHistory)
        .values({
          videoId,
          title,
          artist,
          album: album || null,
          duration: duration || null,
          image: image || null,
          color: color || null,
          playedAt: new Date(),
        })
        .returning();

      return NextResponse.json({ success: true, item: inserted });
    }

    // Saved track (liked / downloaded / cached)
    const validCollection = ["liked", "downloaded", "cached"].includes(collection)
      ? collection
      : "liked";

    const [saved] = await db
      .insert(savedTracks)
      .values({
        videoId,
        collection: validCollection,
        title,
        artist,
        album: album || null,
        duration: duration || null,
        image: image || null,
        color: color || null,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [savedTracks.videoId, savedTracks.collection],
        set: {
          title,
          artist,
          album: album || null,
          duration: duration || null,
          image: image || null,
          color: color || null,
          createdAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ success: true, item: saved });
  } catch (error) {
    console.error("Library POST error:", error);
    return NextResponse.json({ error: "Failed to save track" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");
    const videoId = searchParams.get("videoId");
    const collection = searchParams.get("collection");
    const clear = searchParams.get("clear");

    if (view === "history") {
      if (clear === "all") {
        await db.delete(listeningHistory);
        return NextResponse.json({ success: true, cleared: true });
      }
      if (videoId) {
        await db.delete(listeningHistory).where(eq(listeningHistory.videoId, videoId));
        return NextResponse.json({ success: true, deleted: videoId });
      }
    }

    if (collection && videoId) {
      await db
        .delete(savedTracks)
        .where(
          and(
            eq(savedTracks.collection, collection),
            eq(savedTracks.videoId, videoId)
          )
        );
      return NextResponse.json({ success: true, deleted: { collection, videoId } });
    }

    if (collection && clear === "all") {
      await db
        .delete(savedTracks)
        .where(eq(savedTracks.collection, collection));
      return NextResponse.json({ success: true, cleared: collection });
    }

    return NextResponse.json({ error: "Invalid delete parameters" }, { status: 400 });
  } catch (error) {
    console.error("Library DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete track" }, { status: 500 });
  }
}
