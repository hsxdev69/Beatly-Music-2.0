import YTMusic from "ytmusic-api";
import { Song, Album, Artist, HomeData, HeroSlide, SearchResponse, LyricsResponse, LyricLine } from "./music-types";
import { getHighResArtworkUrl, getTrackAccentColor } from "./images";
import { getSeededHomeData, FALLBACK_SONGS, HERO_SLIDES, ARTIST_RADIOS, FALLBACK_LYRICS_MAP, isValidVideoId, shuffleArrayWithSeed } from "./fallback-music";

let ytMusicInstance: YTMusic | null = null;
let ytInitPromise: Promise<YTMusic> | null = null;

async function getYTMusic(): Promise<YTMusic> {
  if (ytMusicInstance) return ytMusicInstance;
  if (ytInitPromise) return ytInitPromise;

  ytInitPromise = (async () => {
    const yt = new YTMusic();
    const GL = process.env.YT_MUSIC_GL || "IN";
    const HL = process.env.YT_MUSIC_HL || "en";
    const cookies = process.env.YT_MUSIC_COOKIES;

    await yt.initialize({
      GL,
      HL,
      cookies,
    });
    ytMusicInstance = yt;
    return yt;
  })();

  try {
    return await ytInitPromise;
  } catch (err) {
    ytInitPromise = null;
    throw err;
  }
}

export async function withTimeout<T>(promise: Promise<T>, ms: number = 10000, fallback: T): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallback), ms);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutHandle);
      return res;
    }),
    timeoutPromise,
  ]).catch(() => fallback);
}

function safeExtractImage(item: any): string {
  if (!item) return "/icons/icon-512.png";
  if (typeof item.thumbnail === "string" && item.thumbnail.length > 5) {
    return getHighResArtworkUrl(item.thumbnail);
  }
  if (Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
    const best = item.thumbnails[item.thumbnails.length - 1];
    if (best && typeof best.url === "string") {
      return getHighResArtworkUrl(best.url);
    }
  }
  if (typeof item.image === "string") {
    return getHighResArtworkUrl(item.image);
  }
  if (item.videoId && item.videoId.length === 11) {
    return `https://i.ytimg.com/vi/${item.videoId}/maxresdefault.jpg`;
  }
  return "/icons/icon-512.png";
}

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "3:30";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function mapRawSongToSong(raw: any): Song {
  const videoId = raw.videoId || raw.id || "";
  const title = raw.name || raw.title || "Unknown Title";
  
  let artist = "Various Artists";
  let artistId: string | undefined;

  if (typeof raw.artist === "string") {
    artist = raw.artist;
  } else if (raw.artist && typeof raw.artist.name === "string") {
    artist = raw.artist.name;
    artistId = raw.artist.artistId || raw.artist.id;
  } else if (Array.isArray(raw.artists) && raw.artists.length > 0) {
    artist = raw.artists.map((a: any) => (typeof a === "string" ? a : a.name)).filter(Boolean).join(", ");
  } else if (typeof raw.artists === "string") {
    artist = raw.artists;
  }

  let album: string | undefined;
  let albumId: string | undefined;
  if (typeof raw.album === "string") {
    album = raw.album;
  } else if (raw.album && typeof raw.album.name === "string") {
    album = raw.album.name;
    albumId = raw.album.albumId || raw.album.id;
  }

  let duration: number | undefined;
  if (typeof raw.duration === "number") {
    duration = raw.duration;
  } else if (typeof raw.duration === "string") {
    const parts = raw.duration.split(":").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      duration = parts[0] * 60 + parts[1];
    } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }

  const image = safeExtractImage(raw);
  const color = getTrackAccentColor(title + artist);

  return {
    videoId,
    title,
    artist,
    artistId,
    album,
    albumId,
    duration: duration || 210,
    durationText: formatDuration(duration),
    image,
    color,
    views: raw.views || (raw.subscribers ? `${raw.subscribers}` : undefined),
    explicit: raw.isExplicit || false,
  };
}

export function mapRawAlbumToAlbum(raw: any): Album {
  let artist = "Various Artists";
  if (typeof raw.artist === "string") {
    artist = raw.artist;
  } else if (raw.artist && typeof raw.artist.name === "string") {
    artist = raw.artist.name;
  } else if (Array.isArray(raw.artists) && raw.artists.length > 0) {
    artist = raw.artists.map((a: any) => (typeof a === "string" ? a : a.name)).join(", ");
  }

  return {
    albumId: raw.albumId || raw.browseId || raw.id || "",
    title: raw.name || raw.title || "Unknown Album",
    artist,
    year: raw.year || (raw.date ? String(raw.date) : undefined),
    image: safeExtractImage(raw),
    songCount: raw.songCount || (raw.tracks ? raw.tracks.length : undefined),
  };
}

export function mapRawArtistToArtist(raw: any): Artist {
  return {
    artistId: raw.artistId || raw.browseId || raw.id || "",
    name: raw.name || raw.title || "Unknown Artist",
    subscribers: raw.subscribers || raw.subscribersCount,
    image: safeExtractImage(raw),
  };
}

export async function fetchHomeFeed(filter: string = "All", seed: number = 42): Promise<HomeData> {
  try {
    const yt = await getYTMusic();

    let queryModifier = "Hindi Bollywood hits";
    if (filter === "Feel good") queryModifier = "Feel Good Hindi Bollywood happy songs";
    else if (filter === "Romance") queryModifier = "Romantic Hindi love songs Bollywood";
    else if (filter === "Relax") queryModifier = "Relaxing Hindi acoustic lofi songs";
    else if (filter === "Energize") queryModifier = "High energy Bollywood workout Hindi gym";
    else if (filter === "Party") queryModifier = "Bollywood party dance songs Hindi DJ";
    else if (filter === "Comments") queryModifier = "Trending viral Hindi songs reels";
    else if (filter === "Chill") queryModifier = "Chill Hindi indie acoustic vibes";
    else if (filter === "Workout") queryModifier = "Hindi workout energetic motivation Bollywood";
    else if (filter === "Focus") queryModifier = "Hindi instrumental sufi ambient peace";

    // Resilient parallel queries
    const results = await Promise.allSettled([
      withTimeout(yt.searchSongs(`${queryModifier} trending`), 7000, []),
      withTimeout(yt.searchSongs(`Latest Bollywood Hindi songs 2025 2026`), 7000, []),
      withTimeout(yt.searchSongs(`Top 50 Hindi Bollywood Charts India`), 7000, []),
      withTimeout(yt.searchSongs(`Arijit Singh Pritam Shreya Ghoshal hits`), 7000, []),
      withTimeout(yt.searchVideos(`Bollywood Official Music Video Hindi 4K`), 7000, []),
      withTimeout(yt.searchSongs(`Bollywood Dance Bhangra Party Hindi`), 7000, []),
      withTimeout(yt.searchSongs(`All Time Greatest Bollywood Hindi Hits`), 7000, []),
    ]);

    const getSettledArray = (index: number): any[] => {
      const settled = results[index];
      if (settled && settled.status === "fulfilled" && Array.isArray(settled.value)) {
        return settled.value;
      }
      return [];
    };

    const trendingRaw = getSettledArray(0);
    const newReleasesRaw = getSettledArray(1);
    const chartsRaw = getSettledArray(2);
    const dailyDiscoverRaw = getSettledArray(3);
    const musicVideosRaw = getSettledArray(4);
    const danceGridRaw = getSettledArray(5);
    const biggestHitsRaw = getSettledArray(6);

    const mapList = (rawList: any[]): Song[] => {
      return rawList
        .filter((item) => item && (item.videoId || item.id))
        .map(mapRawSongToSong)
        .filter((s) => isValidVideoId(s.videoId));
    };

    let speedDial = mapList(trendingRaw).slice(0, 6);
    let newReleases = mapList(newReleasesRaw).slice(0, 10);
    let charts = mapList(chartsRaw).slice(0, 10);
    let dailyDiscover = mapList(dailyDiscoverRaw).slice(0, 10);
    let musicVideos = mapList(musicVideosRaw).slice(0, 8);
    let danceGrid = mapList(danceGridRaw).slice(0, 8);
    let biggestHits = mapList(biggestHitsRaw).slice(0, 12);
    let community = mapList([...trendingRaw, ...dailyDiscoverRaw]).slice(4, 12);

    const livePool = [...speedDial, ...dailyDiscover, ...charts, ...newReleases];
    if (livePool.length >= 4) {
      const heroSlides: HeroSlide[] = livePool.slice(0, 4).map((song, i) => {
        const fallbackHero = HERO_SLIDES[i % HERO_SLIDES.length];
        return {
          id: `live-hero-${song.videoId}`,
          title: song.title,
          subtitle: song.artist,
          description: `${song.title} from ${song.album || "Featured Hit"} • Streaming now on Beatly`,
          badge: i === 0 ? "Trending #1 in India" : i === 1 ? "Hot Track" : i === 2 ? "Top Chartbuster" : "Recommended",
          color: song.color || fallbackHero.color,
          image: song.image,
          song,
        };
      });

      return {
        hero: heroSlides,
        speedDial: speedDial.length ? speedDial : FALLBACK_SONGS.slice(0, 6),
        community: community.length ? community : FALLBACK_SONGS.slice(4, 12),
        dailyDiscover: dailyDiscover.length ? dailyDiscover : FALLBACK_SONGS.slice(2, 10),
        artistRadios: ARTIST_RADIOS,
        charts: charts.length ? charts : FALLBACK_SONGS.slice(6, 16),
        newReleases: newReleases.length ? newReleases : FALLBACK_SONGS.slice(8, 18),
        musicVideos: musicVideos.length ? musicVideos : FALLBACK_SONGS.slice(1, 9),
        danceGrid: danceGrid.length ? danceGrid : FALLBACK_SONGS.slice(10, 18),
        biggestHits: biggestHits.length ? biggestHits : FALLBACK_SONGS.slice(3, 15),
        seed,
        filter,
        source: "live",
      };
    }
  } catch (error) {
    console.warn("Live YTMusic fetchHomeFeed fallback activated:", error);
  }

  // Graceful fallback to seeded catalogue
  return getSeededHomeData(seed, filter);
}

export async function searchCatalog(query: string): Promise<SearchResponse> {
  const cleanQuery = (query || "").trim();
  if (cleanQuery.length < 2) {
    return {
      songs: [],
      albums: [],
      artists: [],
      suggestions: [],
      source: "empty",
    };
  }

  try {
    const yt = await getYTMusic();

    const results = await Promise.allSettled([
      withTimeout(yt.searchSongs(cleanQuery), 7000, []),
      withTimeout(yt.searchAlbums(cleanQuery), 7000, []),
      withTimeout(yt.searchArtists(cleanQuery), 7000, []),
      withTimeout(yt.getSearchSuggestions(cleanQuery), 5000, []),
    ]);

    const songsRaw = results[0].status === "fulfilled" && Array.isArray(results[0].value) ? results[0].value : [];
    const albumsRaw = results[1].status === "fulfilled" && Array.isArray(results[1].value) ? results[1].value : [];
    const artistsRaw = results[2].status === "fulfilled" && Array.isArray(results[2].value) ? results[2].value : [];
    const suggestionsRaw = results[3].status === "fulfilled" && Array.isArray(results[3].value) ? results[3].value : [];

    const songs: Song[] = songsRaw
      .filter((s: any) => s && (s.videoId || s.id))
      .map(mapRawSongToSong)
      .filter((s) => isValidVideoId(s.videoId));

    const albums: Album[] = albumsRaw
      .filter((a: any) => a && (a.albumId || a.browseId || a.id))
      .map(mapRawAlbumToAlbum);

    const artists: Artist[] = artistsRaw
      .filter((ar: any) => ar && (ar.artistId || ar.browseId || ar.id))
      .map(mapRawArtistToArtist);

    const suggestions: string[] = suggestionsRaw.filter((s: any) => typeof s === "string");

    if (songs.length > 0 || albums.length > 0 || artists.length > 0) {
      return {
        songs,
        albums,
        artists,
        suggestions,
        source: "live",
      };
    }
  } catch (err) {
    console.warn("Search YTMusic error, falling back to local search:", err);
  }

  const q = cleanQuery.toLowerCase();
  const matchedSongs = FALLBACK_SONGS.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      (s.album && s.album.toLowerCase().includes(q))
  );

  return {
    songs: matchedSongs.length > 0 ? matchedSongs : FALLBACK_SONGS.slice(0, 10),
    albums: [
      {
        albumId: "brahmastra",
        title: "Brahmāstra (Original Motion Picture Soundtrack)",
        artist: "Pritam, Amitabh Bhattacharya",
        year: "2022",
        image: "https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg",
        songCount: 8,
      },
      {
        albumId: "jawan",
        title: "Jawan (Hindi)",
        artist: "Anirudh Ravichander",
        year: "2023",
        image: "https://i.ytimg.com/vi/VAdGW7QDJUI/hqdefault.jpg",
        songCount: 7,
      },
    ],
    artists: [
      {
        artistId: "arijit",
        name: "Arijit Singh",
        subscribers: "42M",
        image: "https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg",
      },
      {
        artistId: "shreya",
        name: "Shreya Ghoshal",
        subscribers: "21M",
        image: "https://i.ytimg.com/vi/sK7riqg2mr4/hqdefault.jpg",
      },
    ],
    suggestions: [
      `${cleanQuery} arijit singh`,
      `${cleanQuery} lyrics`,
      `${cleanQuery} unplugged`,
      `${cleanQuery} lofi remix`,
    ],
    source: "fallback",
  };
}

export async function fetchLyricsAndUpNext(videoId: string): Promise<LyricsResponse> {
  let lyricsList: LyricLine[] = [];
  let upNextSongs: Song[] = [];
  let hasLyrics = false;
  let source = "fallback";

  if (FALLBACK_LYRICS_MAP[videoId]) {
    lyricsList = FALLBACK_LYRICS_MAP[videoId];
    hasLyrics = true;
  }

  try {
    const yt = await getYTMusic();

    const [lyricsSettled, upNextSettled] = await Promise.allSettled([
      withTimeout(yt.getLyrics(videoId), 8000, null as any),
      withTimeout(yt.getUpNexts(videoId), 8000, []),
    ]);

    if (lyricsSettled.status === "fulfilled" && lyricsSettled.value) {
      const rawLyrics: any = lyricsSettled.value;
      if (typeof rawLyrics === "string" && rawLyrics.trim().length > 0) {
        lyricsList = rawLyrics
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .map((line: string, idx: number) => ({
            time: idx * 8,
            text: line,
          }));
        hasLyrics = true;
        source = "ytmusic";
      } else if (Array.isArray(rawLyrics)) {
        lyricsList = rawLyrics.map((item: any, idx: number) => ({
          time: typeof item.time === "number" ? item.time : idx * 6,
          text: item.text || String(item),
        }));
        hasLyrics = true;
        source = "ytmusic";
      } else if (rawLyrics && typeof rawLyrics.lyrics === "string") {
        lyricsList = rawLyrics.lyrics
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .map((line: string, idx: number) => ({
            time: idx * 8,
            text: line,
          }));
        hasLyrics = true;
        source = "ytmusic";
      }
    }

    if (upNextSettled.status === "fulfilled" && Array.isArray(upNextSettled.value)) {
      upNextSongs = (upNextSettled.value as any[])
        .filter((raw: any) => raw && (raw.videoId || raw.id))
        .map(mapRawSongToSong)
        .filter((s) => isValidVideoId(s.videoId));
    }
  } catch (err) {
    console.warn("fetchLyricsAndUpNext error:", err);
  }

  if (upNextSongs.length === 0) {
    upNextSongs = shuffleArrayWithSeed(FALLBACK_SONGS, 137).slice(0, 10);
  }

  if (!hasLyrics && FALLBACK_LYRICS_MAP[videoId]) {
    lyricsList = FALLBACK_LYRICS_MAP[videoId];
    hasLyrics = true;
  } else if (!hasLyrics) {
    lyricsList = [
      { time: 5, text: "♪ (Soulful Hindi Melodic Intro) ♪" },
      { time: 15, text: "Suron ki ye barsaat hai" },
      { time: 25, text: "Dil se judi har ek baat hai" },
      { time: 35, text: "Khushboo teri hawaaon mein hai" },
      { time: 48, text: "Har lamha tera hi saath hai" },
      { time: 60, text: "♪ (Music Interlude) ♪" },
      { time: 75, text: "Teri aawaz mein sukoon hai" },
      { time: 90, text: "Ye ishq nahi toh kya junoon hai" },
      { time: 110, text: "♪ (Outro Melody) ♪" },
    ];
    hasLyrics = true;
  }

  return {
    lyrics: lyricsList,
    upNext: upNextSongs,
    hasLyrics,
    source,
  };
}

export async function resolveAlternativeCandidates(title: string, artist: string, excludeId?: string): Promise<string[]> {
  const candidates: string[] = [];
  try {
    const yt = await getYTMusic();
    const query = `${title} ${artist} Hindi audio song`;

    const [videosSettled, songsSettled] = await Promise.allSettled([
      yt.searchVideos(query),
      yt.searchSongs(query),
    ]);

    const addCandidatesFrom = (items: any) => {
      if (Array.isArray(items)) {
        for (const item of items) {
          const vid = item.videoId || item.id;
          if (isValidVideoId(vid) && vid !== excludeId && !candidates.includes(vid)) {
            candidates.push(vid);
          }
        }
      }
    };

    if (videosSettled.status === "fulfilled") addCandidatesFrom(videosSettled.value);
    if (songsSettled.status === "fulfilled") addCandidatesFrom(songsSettled.value);
  } catch (err) {
    console.warn("Resolve candidate error:", err);
  }

  for (const s of FALLBACK_SONGS) {
    if (s.videoId !== excludeId && !candidates.includes(s.videoId)) {
      if (s.title.toLowerCase().includes(title.toLowerCase()) || s.artist.toLowerCase().includes(artist.toLowerCase())) {
        candidates.unshift(s.videoId);
      }
    }
  }

  return candidates.slice(0, 5);
}
