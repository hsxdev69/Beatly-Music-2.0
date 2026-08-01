export interface Song {
  videoId: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration?: number; // seconds
  durationText?: string;
  image: string;
  color?: string;
  views?: string;
  explicit?: boolean;
}

export interface Album {
  albumId: string;
  title: string;
  artist: string;
  year?: string;
  image: string;
  songCount?: number;
}

export interface Artist {
  artistId: string;
  name: string;
  subscribers?: string;
  image: string;
}

export interface ArtistRadio {
  artist: string;
  image: string;
  songCount: number;
  query: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  badge: string;
  color: string;
  song: Song;
}

export interface HomeData {
  hero: HeroSlide[];
  speedDial: Song[];
  community: Song[];
  dailyDiscover: Song[];
  artistRadios: ArtistRadio[];
  charts: Song[];
  newReleases: Song[];
  musicVideos: Song[];
  danceGrid: Song[];
  biggestHits: Song[];
  seed: number;
  filter: string;
  source: "live" | "fallback";
}

export interface LyricLine {
  time?: number; // timestamp in seconds if synced
  text: string;
}

export interface LyricsResponse {
  lyrics: LyricLine[];
  upNext: Song[];
  hasLyrics: boolean;
  source: string;
}

export interface SearchResponse {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  suggestions: string[];
  source: string;
}

export interface UserPlaylist {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  tracks: Song[];
}

export type MoodChip =
  | "All"
  | "Feel good"
  | "Romance"
  | "Relax"
  | "Energize"
  | "Party"
  | "Comments"
  | "Chill"
  | "Workout"
  | "Focus";

export const MOOD_CHIPS: MoodChip[] = [
  "All",
  "Feel good",
  "Romance",
  "Relax",
  "Energize",
  "Party",
  "Comments",
  "Chill",
  "Workout",
  "Focus",
];
