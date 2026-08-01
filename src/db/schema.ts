import { pgTable, serial, varchar, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const savedTracks = pgTable(
  "saved_tracks",
  {
    id: serial("id").primaryKey(),
    videoId: varchar("video_id", { length: 32 }).notNull(),
    collection: varchar("collection", { length: 24 }).notNull(), // 'liked' | 'downloaded' | 'cached'
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    album: text("album"),
    duration: integer("duration"),
    image: text("image"),
    color: varchar("color", { length: 24 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("saved_tracks_video_collection_idx").on(table.videoId, table.collection),
    index("saved_tracks_collection_idx").on(table.collection),
  ]
);

export const listeningHistory = pgTable(
  "listening_history",
  {
    id: serial("id").primaryKey(),
    videoId: varchar("video_id", { length: 32 }).notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    album: text("album"),
    duration: integer("duration"),
    image: text("image"),
    color: varchar("color", { length: 24 }),
    playedAt: timestamp("played_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("listening_history_played_at_idx").on(table.playedAt),
  ]
);

export type SavedTrack = typeof savedTracks.$inferSelect;
export type NewSavedTrack = typeof savedTracks.$inferInsert;

export type ListeningHistoryItem = typeof listeningHistory.$inferSelect;
export type NewListeningHistoryItem = typeof listeningHistory.$inferInsert;
