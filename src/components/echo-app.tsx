"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  FileText,
  Clock,
  MoreVertical,
  ChevronDown,
  Search,
  Home as HomeIcon,
  Compass,
  Library as LibraryIcon,
  RotateCw,
  Sliders,
  Share2,
  Download,
  FolderPlus,
  Trash2,
  Volume2,
  VolumeX,
  Sparkles,
  Cast,
  Users,
  Settings,
  X,
  Check,
  Disc,
  ArrowRight,
  TrendingUp,
  Radio,
  Flame,
  Music2,
  Info,
  Layers,
  History as HistoryIcon,
} from "lucide-react";
import { YouTubePlayer, YouTubePlayerHandle } from "./youtube-player";
import {
  Song,
  Album,
  Artist,
  HomeData,
  HeroSlide,
  LyricsResponse,
  LyricLine,
  SearchResponse,
  UserPlaylist,
  MoodChip,
  MOOD_CHIPS,
} from "@/lib/music-types";
import { getThumbnailFromAny, getHighResArtworkUrl } from "@/lib/images";
import {
  FullFeedSkeleton,
  SearchSkeleton,
  LibrarySkeleton,
} from "./skeleton";

// --- Smart Image with Fallback Ladder ---
function SmartImage({
  src,
  videoId,
  alt = "",
  className = "",
}: {
  src?: string | null;
  videoId?: string;
  alt?: string;
  className?: string;
}) {
  const candidateUrls = useRef<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    candidateUrls.current = getThumbnailFromAny(src, videoId);
    setCurrentIdx(0);
    setIsLoaded(false);
  }, [src, videoId]);

  const handleStepDown = () => {
    if (currentIdx + 1 < candidateUrls.current.length) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    // YouTube returns a 120x90 grey placeholder with HTTP 200 for missing maxresdefault
    if (target.naturalWidth > 0 && target.naturalWidth <= 121) {
      handleStepDown();
    } else {
      setIsLoaded(true);
    }
  };

  const activeSrc =
    candidateUrls.current[currentIdx] ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "/icons/icon-512.png");

  return (
    <div className={`relative overflow-hidden bg-[#141519] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeSrc}
        alt={alt}
        loading="lazy"
        onLoad={handleImgLoad}
        onError={handleStepDown}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

// Format seconds into mm:ss
function formatTime(secs: number): string {
  if (isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function EchoApp() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"home" | "explore" | "library">("home");
  const [activeMood, setActiveMood] = useState<MoodChip>("All");
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedData, setFeedData] = useState<HomeData | null>(null);
  const [feedSeed, setFeedSeed] = useState<number>(() => Math.floor(Math.random() * 100000));
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Playback state
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [isShuffle, setIsShuffle] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const triedAlternativeIds = useRef<Set<string>>(new Set());
  // Tracks video IDs for which related "Up Next" songs have already been fetched
  const autoQueuedForRef = useRef<Set<string>>(new Set());

  // Overlays and Modals
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<"lyrics" | "sleep" | "queue" | "more" | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isCastOpen, setIsCastOpen] = useState(false);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isSongInfoOpen, setIsSongInfoOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Library / DB State
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [libraryTracks, setLibraryTracks] = useState<Song[]>([]);
  const [libraryView, setLibraryView] = useState<"main" | "liked" | "downloaded" | "cached" | "history" | "playlist">("main");
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<UserPlaylist | null>(null);
  const [librarySummary, setLibrarySummary] = useState({ liked: 0, downloaded: 0, cached: 0, history: 0 });

  // Sleep timer state
  const [sleepMinutes, setSleepMinutes] = useState(30);
  const [sleepTimerActive, setSleepTimerActive] = useState(false);
  const [sleepEndOfSong, setSleepEndOfSong] = useState(false);
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState<number | null>(null);
  const sleepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Equalizer preset
  const [eqPreset, setEqPreset] = useState<"bass" | "vocal" | "acoustic" | "party" | "flat">("bass");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTab, setSearchTab] = useState<"all" | "songs" | "albums" | "artists">("all");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hero carousel index
  const [heroIndex, setHeroIndex] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // --- Initial Mount & Feed Loading ---
  const loadHomeFeed = useCallback(async (seed: number, mood: string) => {
    setIsFeedLoading(true);
    try {
      const res = await fetch(`/api/music/home?seed=${seed}&filter=${encodeURIComponent(mood)}`);
      if (res.ok) {
        const data: HomeData = await res.json();
        setFeedData(data);
        if (!currentTrack && data.hero && data.hero[0]?.song) {
          // Pre-cue first song without autoplay
          setCurrentTrack(data.hero[0].song);
          setQueue(data.speedDial.length ? data.speedDial : [data.hero[0].song]);
          setQueueIndex(0);
        }
      }
    } catch (err) {
      console.error("Failed to load feed:", err);
    } finally {
      setIsFeedLoading(false);
      setIsRefreshing(false);
    }
  }, [currentTrack]);

  // Load Library summary & collections
  const loadLibraryData = useCallback(async () => {
    try {
      const summaryRes = await fetch("/api/library?summary=true");
      if (summaryRes.ok) {
        const counts = await summaryRes.json();
        setLibrarySummary(counts);
      }

      const likedRes = await fetch("/api/library?collection=liked");
      if (likedRes.ok) {
        const data = await likedRes.json();
        if (Array.isArray(data.items)) {
          setLikedIds(new Set(data.items.map((it: any) => it.videoId)));
        }
      }

      const downloadedRes = await fetch("/api/library?collection=downloaded");
      if (downloadedRes.ok) {
        const data = await downloadedRes.json();
        if (Array.isArray(data.items)) {
          setDownloadedIds(new Set(data.items.map((it: any) => it.videoId)));
        }
      }
    } catch (e) {
      console.warn("Error loading library data:", e);
    }
  }, []);

  // Sync localStorage for search history and playlists
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("beatly.searchHistory");
      if (storedHistory) setSearchHistory(JSON.parse(storedHistory));

      const storedPlaylists = localStorage.getItem("beatly.playlists");
      if (storedPlaylists) {
        setPlaylists(JSON.parse(storedPlaylists));
      } else {
        // Starter playlist
        const defaultPl: UserPlaylist[] = [
          {
            id: "pl-bollywood-vibes",
            name: "Bollywood Hits & Vibes",
            description: "Curated collection of favorite Hindi tracks",
            createdAt: Date.now(),
            tracks: [],
          },
        ];
        setPlaylists(defaultPl);
        localStorage.setItem("beatly.playlists", JSON.stringify(defaultPl));
      }
    } catch (e) {
      console.warn("LocalStorage load error:", e);
    }

    loadLibraryData();
  }, [loadLibraryData]);

  useEffect(() => {
    loadHomeFeed(feedSeed, activeMood);
  }, [feedSeed, activeMood, loadHomeFeed]);

  // Rotate hero carousel automatically every 8 seconds
  useEffect(() => {
    if (!feedData?.hero || feedData.hero.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % feedData.hero.length);
    }, 7500);
    return () => clearInterval(interval);
  }, [feedData?.hero]);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimerActive && sleepSecondsLeft !== null && sleepSecondsLeft > 0) {
      sleepIntervalRef.current = setInterval(() => {
        setSleepSecondsLeft((prev) => {
          if (prev === null || prev <= 1) {
            playerRef.current?.pause();
            setSleepTimerActive(false);
            showToast("Sleep timer finished. Playback paused.");
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    }

    return () => {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    };
  }, [sleepTimerActive, sleepSecondsLeft]);

  // --- Media Session API: Lock screen / notification controls ---
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const artworkUrl = getHighResArtworkUrl(currentTrack.image || '/icons/icon-512.png');
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Beatly Music',
        artwork: [
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
        ],
      });
    } catch (e) {
      console.warn('MediaSession metadata update failed:', e);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {}
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Wire native media controls to app playback functions
    navigator.mediaSession.setActionHandler('play', () => {
      if (!isPlaying) togglePlayPause();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (isPlaying) togglePlayPause();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playPrevious();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNext();
    });

    // Cleanup handlers on unmount
    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      } catch {}
    };
  }, []);

  // --- Track Playback Actions ---
  // Fetch songs related to the given track and append them to the queue so
  // "Up Next" always continues with music related to what's currently playing.
  const ensureRelatedQueue = useCallback(
    async (song: Song, mode: "afterCurrent" | "append") => {
      if (!song?.videoId) return;
      // Avoid re-fetching related songs for the same track repeatedly
      if (autoQueuedForRef.current.has(song.videoId)) return;
      autoQueuedForRef.current.add(song.videoId);

      try {
        const res = await fetch(`/api/music/lyrics/${song.videoId}`);
        if (!res.ok) return;
        const data: LyricsResponse = await res.json();
        const related = (data.upNext || []).filter(
          (s) => s.videoId && s.videoId !== song.videoId
        );
        if (related.length === 0) return;

        setQueue((prev) => {
          const currentIdx = prev.findIndex((s) => s.videoId === song.videoId);
          if (currentIdx === -1) return prev;

          const existingIds = new Set(prev.map((s) => s.videoId));
          const newOnes = related.filter((s) => !existingIds.has(s.videoId));
          if (newOnes.length === 0) return prev;

          if (mode === "append") {
            // Keep the caller-supplied list intact and add related songs to the
            // very end so playback naturally flows into related music.
            return [...prev, ...newOnes];
          }

          // Insert related tracks directly after the current song.
          const head = prev.slice(0, currentIdx + 1);
          const tail = prev.slice(currentIdx + 1);
          return [...head, ...newOnes, ...tail];
        });
      } catch (err) {
        console.warn("Failed to build related Up Next queue:", err);
      }
    },
    []
  );

  const playTrack = useCallback((song: Song, newQueue?: Song[]) => {
    if (!song || !song.videoId) return;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 — START PLAYBACK SYNCHRONOUSLY, FIRST, INSIDE THE USER GESTURE.
    // Mobile browsers/webviews only honour playback that is initiated in the
    // same synchronous tick as the tap. Any await/fetch/setTimeout before this
    // call causes the gesture token to expire and playback is silently blocked.
    // Equivalent to: audio.src = url; const p = audio.play();
    // ─────────────────────────────────────────────────────────────────────────
    playerRef.current?.load(song.videoId, true);

    triedAlternativeIds.current.clear();
    setCurrentTrack(song);
    // Reset playback UI to loading state until YouTube player fires PLAYING
    setIsLoadingTrack(true);
    setIsPlaying(false);

    // Whether the caller supplied a rich list (e.g. a chart/section/search list)
    // that already forms a meaningful queue around the song.
    const hasRichQueue = Boolean(newQueue && newQueue.length > 1);

    // When no queue is supplied, the song may already live inside the current
    // queue (e.g. next/previous navigation or tapping an Up Next row). In that
    // case we preserve the existing queue instead of collapsing it.
    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      const foundIdx = newQueue.findIndex((s) => s.videoId === song.videoId);
      setQueueIndex(foundIdx >= 0 ? foundIdx : 0);
      // A new queue context was established — allow related songs to be appended
      // again even if this track was auto-queued in a previous session.
      autoQueuedForRef.current.delete(song.videoId);
    } else {
      setQueue((prev) => {
        const existingIdx = prev.findIndex((s) => s.videoId === song.videoId);
        if (existingIdx >= 0) {
          setQueueIndex(existingIdx);
          return prev;
        }
        setQueueIndex(0);
        return [song];
      });
    }

    // STEP 2 — everything below is async / non-blocking and runs AFTER playback
    // has already been requested above.

    // Populate "Up Next" with songs related to this track.
    // - Rich list supplied (search/chart/section): append related songs at the
    //   END so the user's chosen list plays first, then flows into related music.
    // - Single song (history/hero/lone result) or advancing within the existing
    //   queue: insert related songs right AFTER the current track.
    ensureRelatedQueue(song, hasRichQueue ? "append" : "afterCurrent");

    // Record listening history in PostgreSQL
    fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "history",
        videoId: song.videoId,
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        image: song.image,
        color: song.color,
      }),
    }).catch((err) => console.warn("Failed to record history:", err));

    // Also mark as cached
    setCachedIds((prev) => new Set(prev).add(song.videoId));

    // Reset lyrics when changing song
    setLyricsData(null);
  }, [ensureRelatedQueue]);

  /**
   * SPA-safe song click handler.
   * Injects preventDefault() + stopPropagation() so no default browser
   * navigation / anchor / form behavior can ever trigger a full page reload.
   * The only side effects are: player source swap + UI state updates.
   */
  const handleSongClick = useCallback(
    (e: React.MouseEvent | React.SyntheticEvent, song: Song, newQueue?: Song[]) => {
      e.preventDefault();
      e.stopPropagation();
      playTrack(song, newQueue);
    },
    [playTrack]
  );

  const togglePlayPause = (e?: React.MouseEvent) => {
    // SPA safety: never allow default browser behavior on transport buttons.
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!currentTrack) {
      if (feedData?.hero[0]?.song) {
        playTrack(feedData.hero[0].song, feedData.speedDial);
      }
      return;
    }

    // Called synchronously from the button's onClick — no awaits before play().
    if (isPlaying) {
      playerRef.current?.pause();
      return;
    }

    const playPromise = playerRef.current?.play?.() as unknown;

    if (playPromise !== undefined && typeof (playPromise as Promise<void>)?.then === "function") {
      (playPromise as Promise<void>)
        .then(() => {
          // Success: force UI to show the 'Pause' button
          setIsPlaying(true);
          setIsLoadingTrack(false);
        })
        .catch((error: unknown) => {
          console.error("Playback blocked by browser strict policy:", error);
          // Fallback: force UI back to 'Play' so the user can retry manually
          setIsPlaying(false);
          setIsLoadingTrack(false);
        });
    }
  };

  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    if (sleepEndOfSong && sleepTimerActive) {
      playerRef.current?.pause();
      setSleepTimerActive(false);
      setSleepEndOfSong(false);
      showToast("End-of-song sleep timer triggered.");
      return;
    }

    let nextIdx: number;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === "all") {
          nextIdx = 0;
        } else {
          // End of queue — let player state settle naturally
          return;
        }
      }
    }

    setQueueIndex(nextIdx);
    const nextSong = queue[nextIdx];
    if (nextSong) {
      playTrack(nextSong);
    }
  }, [queue, queueIndex, isShuffle, repeatMode, sleepEndOfSong, sleepTimerActive]);

  const playPrevious = () => {
    if (currentTime > 4) {
      // Seek to start
      playerRef.current?.seek(0);
      setCurrentTime(0);
      return;
    }

    if (queue.length === 0) return;
    const prevIdx = queueIndex - 1 < 0 ? queue.length - 1 : queueIndex - 1;
    setQueueIndex(prevIdx);
    const prevSong = queue[prevIdx];
    if (prevSong) playTrack(prevSong);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    playerRef.current?.seek(newTime);
  };

  const toggleLike = async (song: Song) => {
    const isLiked = likedIds.has(song.videoId);
    const updated = new Set(likedIds);

    if (isLiked) {
      updated.delete(song.videoId);
      setLikedIds(updated);
      showToast(`Removed "${song.title}" from Liked Songs`);
      await fetch(`/api/library?collection=liked&videoId=${song.videoId}`, {
        method: "DELETE",
      });
    } else {
      updated.add(song.videoId);
      setLikedIds(updated);
      showToast(`Saved "${song.title}" to Liked Songs`);
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: "liked",
          videoId: song.videoId,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          image: song.image,
          color: song.color,
        }),
      });
    }
    loadLibraryData();
  };

  const handleDownload = async (song: Song) => {
    try {
      showToast(`Downloading "${song.title}"...`);
      const url = `/api/music/download/${song.videoId}?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download request failed");

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${song.artist} - ${song.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      // Save to downloaded collection in PostgreSQL
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: "downloaded",
          videoId: song.videoId,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          image: song.image,
          color: song.color,
        }),
      });

      setDownloadedIds((prev) => new Set(prev).add(song.videoId));
      loadLibraryData();
      showToast(`Saved "${song.title}" for offline playback!`);
    } catch (err) {
      console.error("Download failed:", err);
      showToast("Download failed. Please try again.");
    }
  };

  // YouTube Error Recovery (Codes 101/150 embedding blocked, 2, 5, 100)
  const handlePlayerError = async (code: number) => {
    console.warn(`YouTube Player reported code ${code} for video ${currentTrack?.videoId}`);
    if (!currentTrack) return;
    setIsLoadingTrack(false);

    if ([101, 150, 2, 5, 100].includes(code)) {
      showToast("Finding embeddable audio stream...");
      try {
        const res = await fetch(
          `/api/music/resolve?title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist)}&exclude=${currentTrack.videoId}`
        );
        if (res.ok) {
          const data = await res.json();
          const candidates: string[] = data.candidates || [];

          for (const candidateId of candidates) {
            if (!triedAlternativeIds.current.has(candidateId)) {
              triedAlternativeIds.current.add(candidateId);
              console.log(`Retrying playback with resolved alternative: ${candidateId}`);
              playerRef.current?.load(candidateId, true);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Resolve route error during recovery:", err);
      }

      // If all candidates exhausted, move forward without stalling
      showToast("Embedding unavailable for this track. Playing next.");
      playNext();
    }
  };

  const handlePlayerEnded = () => {
    if (repeatMode === "one" && currentTrack) {
      playerRef.current?.load(currentTrack.videoId, true);
    } else {
      playNext();
    }
  };

  // Load Lyrics
  const loadLyrics = async (song: Song) => {
    setIsLoadingLyrics(true);
    try {
      const res = await fetch(`/api/music/lyrics/${song.videoId}`);
      if (res.ok) {
        const data: LyricsResponse = await res.json();
        setLyricsData(data);
      }
    } catch (e) {
      console.warn("Error fetching lyrics:", e);
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  useEffect(() => {
    if (activeOverlay === "lyrics" && currentTrack && !lyricsData) {
      loadLyrics(currentTrack);
    }
  }, [activeOverlay, currentTrack, lyricsData]);

  // Auto-scroll active lyric line
  useEffect(() => {
    if (activeOverlay === "lyrics" && lyricsContainerRef.current && lyricsData?.lyrics) {
      const activeElement = lyricsContainerRef.current.querySelector(".active-lyric-line");
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentTime, activeOverlay, lyricsData]);

  // Search Debounce with prefix collapse
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(val.trim())}`);
        if (res.ok) {
          const data: SearchResponse = await res.json();
          setSearchResults(data);

          // Update search history with prefix collapse
          setSearchHistory((prev) => {
            const queryClean = val.trim().toLowerCase();
            const filtered = prev.filter(
              (item) =>
                item.toLowerCase() !== queryClean &&
                !queryClean.startsWith(item.toLowerCase())
            );
            const updated = [val.trim(), ...filtered].slice(0, 12);
            localStorage.setItem("beatly.searchHistory", JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.warn("Search fetch error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 450);
  };

  const removeSearchHistoryItem = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== itemToRemove);
      localStorage.setItem("beatly.searchHistory", JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("beatly.searchHistory");
  };

  // Playlists helper
  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPl: UserPlaylist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      description: newPlaylistDesc.trim() || undefined,
      createdAt: Date.now(),
      tracks: currentTrack ? [currentTrack] : [],
    };
    const updated = [newPl, ...playlists];
    setPlaylists(updated);
    localStorage.setItem("beatly.playlists", JSON.stringify(updated));
    setNewPlaylistName("");
    setNewPlaylistDesc("");
    setIsCreatePlaylistOpen(false);
    showToast(`Created playlist "${newPl.name}"`);
  };

  const addTrackToPlaylist = (plId: string, song: Song) => {
    setPlaylists((prev) => {
      const updated = prev.map((pl) => {
        if (pl.id === plId) {
          const exists = pl.tracks.some((t) => t.videoId === song.videoId);
          if (exists) {
            showToast(`Already in "${pl.name}"`);
            return pl;
          }
          showToast(`Added "${song.title}" to "${pl.name}"`);
          return { ...pl, tracks: [...pl.tracks, song] };
        }
        return pl;
      });
      localStorage.setItem("beatly.playlists", JSON.stringify(updated));
      return updated;
    });
    setIsAddToPlaylistOpen(false);
  };

  // Load smart folder content
  const openLibraryFolder = async (folderType: "liked" | "downloaded" | "cached" | "history") => {
    setLibraryView(folderType);
    if (folderType === "history") {
      const res = await fetch("/api/library?view=history");
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.items || []);
      }
    } else {
      const res = await fetch(`/api/library?collection=${folderType}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setLibraryTracks(
            data.items.map((row: any) => ({
              videoId: row.videoId,
              title: row.title,
              artist: row.artist,
              album: row.album || undefined,
              duration: row.duration || 210,
              durationText: formatTime(row.duration || 210),
              image: row.image || "/icons/icon-512.png",
              color: row.color || "#ff4f8a",
            }))
          );
        }
      }
    }
  };

  const clearHistoryData = async () => {
    await fetch("/api/library?view=history&clear=all", { method: "DELETE" });
    setHistoryItems([]);
    loadLibraryData();
    showToast("Listening history cleared");
  };

  const currentHero = feedData?.hero[heroIndex] || feedData?.hero[0];
  const activeTrackColor = currentTrack?.color || "#ff4f8a";

  return (
    <div
      className="relative flex min-h-screen flex-col bg-[#08090b] text-[#f8fafc] select-none pb-28 md:pb-24"
      style={{ "--glow-color": activeTrackColor } as React.CSSProperties}
    >
      {/* Invisible YouTube Audio Engine */}
      <YouTubePlayer
        ref={playerRef}
        // Stable constant — the engine mounts once and is driven imperatively
        // via load()/play()/pause() so playback is never torn down mid-session.
        initialVideoId="BddP6PYo2gs"
        onPlayingChange={(playing) => {
          setIsPlaying(playing);
          if (playing) setIsLoadingTrack(false);
        }}
        onTimeChange={(curr, dur) => {
          setCurrentTime(curr);
          if (dur > 0) setDuration(dur);
        }}
        onEnded={handlePlayerEnded}
        onError={handlePlayerError}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 z-50 -translate-x-1/2 animate-bounce rounded-full bg-[#1c1d24]/95 px-5 py-2.5 text-xs font-medium text-white shadow-2xl backdrop-blur-md border border-white/10">
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#ff4f8a]" />
            {toastMessage}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN: HOME                                                              */}
      {/* ========================================================================= */}
      {activeTab === "home" && (
        <main className="flex-1 overflow-x-hidden">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#08090b]/90 px-4 py-3.5 backdrop-blur-lg">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4f8a] to-[#9333ea] shadow-md shadow-[#ff4f8a]/20">
                <Disc className="h-5 w-5 text-white animate-spin-slow" />
              </div>
              <div>
                <h1 className="font-['Yatra_One'] text-xl font-bold tracking-wide bg-gradient-to-r from-white via-pink-100 to-[#ff4f8a] bg-clip-text text-transparent">
                  Beatly Music
                </h1>
                <p className="text-[10px] uppercase font-semibold tracking-wider text-pink-400/80 -mt-0.5">
                  Hindi & Bollywood
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsRefreshing(true);
                  const newSeed = Math.floor(Math.random() * 100000);
                  setFeedSeed(newSeed);
                  showToast("Refreshed with fresh Bollywood seed");
                }}
                aria-label="Refresh Feed"
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-[#ff4f8a]" : ""}`} />
              </button>
              <button
                onClick={() => {
                  setActiveTab("library");
                  openLibraryFolder("history");
                }}
                aria-label="History"
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <HistoryIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsCastOpen(true)}
                aria-label="Cast simulation"
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <Cast className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsCommunityOpen(true)}
                aria-label="Community"
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <Users className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Settings"
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Mood Filter Chips */}
          <div className="sticky top-[57px] z-20 flex gap-2 overflow-x-auto px-4 py-2.5 bg-[#08090b]/95 backdrop-blur-md no-scrollbar border-b border-white/5">
            {MOOD_CHIPS.map((chip) => {
              const isActive = activeMood === chip;
              return (
                <button
                  key={chip}
                  onClick={() => setActiveMood(chip)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-[#ff4f8a] text-white shadow-lg shadow-[#ff4f8a]/30 scale-105"
                      : "bg-[#14151a] text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
                  }`}
                >
                  {chip === "All" ? "🔥 All Hindi" : chip}
                </button>
              );
            })}
          </div>

          {/* Source Indicator Pill */}
          {feedData && (
            <div className="mx-4 mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#7dd3a5] animate-pulse" />
                {feedData.source === "live" ? "Live YouTube Music Stream (India GL)" : "Offline Hindi Catalogue (Demo Mode)"}
              </span>
              <span className="text-[10px] text-slate-500">Seed: #{feedData.seed}</span>
            </div>
          )}

          {isFeedLoading ? (
            <FullFeedSkeleton />
          ) : (
            <div className="space-y-6 pt-2 pb-12">
              {/* 1. Top Hero Carousel - 10 Song Cards */}
              {feedData && (
                <section className="px-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Featured Hits</h3>
                    <span className="text-xs text-slate-400">Swipe →</span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar pb-2">
                    {(() => {
                      const featured = [
                        ...(feedData.speedDial || []),
                        ...(feedData.dailyDiscover || []),
                        ...(feedData.charts || []),
                      ].slice(0, 10);
                      return featured.map((song, i) => {
                        const isCurrent = currentTrack?.videoId === song.videoId;
                        return (
                          <div
                            key={`${song.videoId}-${i}`}
                            onClick={(e) => handleSongClick(e, song, featured)}
                            className="snap-center shrink-0 w-[160px] cursor-pointer group"
                          >
                            <div className={`relative aspect-square w-full overflow-hidden rounded-2xl border shadow-lg transition-transform duration-300 group-hover:scale-[1.02] ${
                              isCurrent ? 'border-[#ff4f8a]/60 ring-2 ring-[#ff4f8a]/40' : 'border-white/10'
                            }`}>
                              <SmartImage src={song.image} videoId={song.videoId} className="h-full w-full" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                                <p className="truncate text-xs font-bold text-white">{song.title}</p>
                                <p className="truncate text-[10px] text-pink-200">{song.artist}</p>
                              </div>
                              <div className="absolute top-2 right-2 flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleLike(song); }}
                                  className="rounded-full bg-black/60 p-1.5 backdrop-blur-md"
                                >
                                  <Heart className={`h-3.5 w-3.5 ${likedIds.has(song.videoId) ? 'fill-[#ff4f8a] text-[#ff4f8a]' : 'text-white'}`} />
                                </button>
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff4f8a] shadow-lg">
                                  <Play className="h-4 w-4 fill-white ml-0.5" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </section>
              )}

              {/* 2. Speed Dial Grid (2-column) */}
              {feedData?.speedDial && feedData.speedDial.length > 0 && (
                <section className="px-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      Quick Picks
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {feedData.speedDial.map((song) => {
                      const isCurrent = currentTrack?.videoId === song.videoId;
                      return (
                        <div
                          key={song.videoId}
                          onClick={(e) => handleSongClick(e, song, feedData.speedDial)}
                          className={`group flex items-center gap-2.5 overflow-hidden rounded-xl p-2 cursor-pointer transition-all ${
                            isCurrent
                              ? "bg-[#ff4f8a]/20 border border-[#ff4f8a]/50"
                              : "bg-[#141519] hover:bg-[#1c1e24] border border-white/5"
                          }`}
                        >
                          <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden">
                            <SmartImage src={song.image} videoId={song.videoId} />
                            <div
                              className={`absolute inset-0 flex items-center justify-center bg-black/40 ${
                                isCurrent && isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              } transition`}
                            >
                              {isCurrent && isPlaying ? (
                                <span className="flex gap-0.5 items-end h-4">
                                  <span className="w-1 bg-[#ff4f8a] h-3 animate-pulse" />
                                  <span className="w-1 bg-[#ff4f8a] h-4 animate-pulse delay-75" />
                                  <span className="w-1 bg-[#ff4f8a] h-2 animate-pulse delay-150" />
                                </span>
                              ) : (
                                <Play className="h-4 w-4 fill-white text-white" />
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-xs font-semibold ${isCurrent ? "text-[#ff4f8a]" : "text-white"}`}>
                              {song.title}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">{song.artist}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 3. From the Community */}
              {feedData?.community && feedData.community.length > 0 && (
                <section className="px-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-['Yatra_One'] text-lg font-bold text-white">From the Community</h3>
                      <p className="text-xs text-slate-400">Curated trending Hindi vibes</p>
                    </div>
                    <button
                      onClick={(e) => handleSongClick(e, feedData.community[0], feedData.community)}
                      className="text-xs font-semibold text-[#ff4f8a] hover:underline"
                    >
                      Play All
                    </button>
                  </div>
                  <div className="flex gap-3.5 overflow-x-auto pb-2 no-scrollbar">
                    {feedData.community.map((song) => (
                      <div
                        key={song.videoId}
                        onClick={(e) => handleSongClick(e, song, feedData.community)}
                        className="w-[140px] shrink-0 cursor-pointer group space-y-2"
                      >
                        <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-lg border border-white/5 group-hover:scale-105 transition-transform duration-300">
                          <SmartImage src={song.image} videoId={song.videoId} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff4f8a] shadow-lg">
                              <Play className="h-4 w-4 fill-white text-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <p className="truncate text-xs font-semibold text-white group-hover:text-[#ff4f8a] transition">
                          {song.title}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{song.artist}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 4. Daily Discover & Artist Radios */}
              {feedData?.dailyDiscover && (
                <section className="px-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Daily Discover</h3>
                      <p className="text-xs text-slate-400">Personalized artist radios & mixes</p>
                    </div>
                    <button
                      onClick={(e) => handleSongClick(e, feedData.dailyDiscover[0], feedData.dailyDiscover)}
                      className="flex items-center gap-1.5 rounded-full bg-[#1c1e24] px-3 py-1.5 text-xs font-semibold text-white border border-white/10 hover:bg-white/10 transition"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      Play All
                    </button>
                  </div>

                  {/* Artist Radios Row */}
                  <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
                    {feedData.artistRadios.map((radio, idx) => (
                      <div
                        key={idx}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          showToast(`Loading radio for ${radio.artist}...`);
                          const res = await fetch(`/api/music/search?q=${encodeURIComponent(radio.query)}`);
                          if (res.ok) {
                            const data: SearchResponse = await res.json();
                            if (data.songs.length > 0) {
                              playTrack(data.songs[0], data.songs);
                            }
                          }
                        }}
                        className="flex w-[120px] shrink-0 flex-col items-center text-center cursor-pointer group"
                      >
                        <div className="relative mb-2 h-20 w-20 overflow-hidden rounded-full border-2 border-white/10 p-0.5 shadow-md group-hover:border-[#ff4f8a] transition">
                          <SmartImage src={radio.image} className="rounded-full" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition">
                            <Radio className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <p className="truncate w-full text-xs font-bold text-white group-hover:text-[#ff4f8a]">
                          {radio.artist}
                        </p>
                        <p className="text-[10px] text-slate-400">{radio.songCount} hits radio</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5. Top Charts */}
              {feedData?.charts && feedData.charts.length > 0 && (
                <section className="px-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-[#ff4f8a]" />
                      <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Top Hindi Charts</h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">India Top 50</span>
                  </div>
                  <div className="space-y-2">
                    {feedData.charts.slice(0, 7).map((song, i) => {
                      const isCurrent = currentTrack?.videoId === song.videoId;
                      return (
                        <div
                          key={song.videoId}
                          onClick={(e) => handleSongClick(e, song, feedData.charts)}
                          className={`flex items-center gap-3.5 rounded-xl p-2.5 cursor-pointer transition ${
                            isCurrent
                              ? "bg-[#ff4f8a]/20 border border-[#ff4f8a]/40"
                              : "bg-[#121317] hover:bg-[#181920] border border-white/5"
                          }`}
                        >
                          <span
                            className={`w-5 text-center text-sm font-extrabold ${
                              i === 0 ? "text-[#ff4f8a]" : i === 1 ? "text-amber-400" : i === 2 ? "text-cyan-400" : "text-slate-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden">
                            <SmartImage src={song.image} videoId={song.videoId} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-xs font-bold ${isCurrent ? "text-[#ff4f8a]" : "text-white"}`}>
                              {song.title}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">{song.artist}</p>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">{song.durationText}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(song);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#ff4f8a]"
                          >
                            <Heart
                              className={`h-4 w-4 ${likedIds.has(song.videoId) ? "fill-[#ff4f8a] text-[#ff4f8a]" : ""}`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 6. Fresh New Releases */}
              {feedData?.newReleases && feedData.newReleases.length > 0 && (
                <section className="px-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Fresh Bollywood Drops</h3>
                      <p className="text-xs text-slate-400">Newly released tracks & singles</p>
                    </div>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {feedData.newReleases.map((song) => (
                      <div
                        key={song.videoId}
                        onClick={(e) => handleSongClick(e, song, feedData.newReleases)}
                        className="w-[150px] shrink-0 cursor-pointer group space-y-2"
                      >
                        <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-lg border border-white/5 group-hover:scale-105 transition-transform duration-300">
                          <SmartImage src={song.image} videoId={song.videoId} />
                          <div className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-md">
                            New
                          </div>
                        </div>
                        <p className="truncate text-xs font-semibold text-white group-hover:text-[#ff4f8a]">
                          {song.title}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{song.artist}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 7. Official Music Videos (16:9) */}
              {feedData?.musicVideos && feedData.musicVideos.length > 0 && (
                <section className="px-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Official Music Videos</h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {feedData.musicVideos.map((video) => (
                      <div
                        key={video.videoId}
                        onClick={(e) => handleSongClick(e, video, feedData.musicVideos)}
                        className="w-[240px] shrink-0 cursor-pointer group space-y-2"
                      >
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-md border border-white/5 group-hover:scale-105 transition-transform duration-300">
                          <SmartImage src={video.image} videoId={video.videoId} />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff4f8a] text-white shadow-lg">
                              <Play className="h-5 w-5 fill-white ml-0.5" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {video.durationText || "Video"}
                          </div>
                        </div>
                        <p className="truncate text-xs font-semibold text-white group-hover:text-[#ff4f8a]">
                          {video.title}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{video.artist}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 8. Dance & Party Grid */}
              {feedData?.danceGrid && feedData.danceGrid.length > 0 && (
                <section className="px-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Dance & Party Hits</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {feedData.danceGrid.slice(0, 4).map((song) => (
                      <div
                        key={song.videoId}
                        onClick={(e) => handleSongClick(e, song, feedData.danceGrid)}
                        className="cursor-pointer group space-y-2 rounded-2xl bg-[#121317] p-2 border border-white/5 hover:border-[#ff4f8a]/40 transition"
                      >
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden">
                          <SmartImage src={song.image} videoId={song.videoId} />
                        </div>
                        <p className="truncate text-xs font-bold text-white">{song.title}</p>
                        <p className="truncate text-[11px] text-slate-400">{song.artist}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 9. India's Biggest Hits */}
              {feedData?.biggestHits && (
                <section className="px-4 pb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-['Yatra_One'] text-lg font-bold text-white">India&apos;s Biggest Hits</h3>
                  </div>
                  <div className="space-y-2">
                    {feedData.biggestHits.slice(0, 6).map((song) => (
                      <div
                        key={song.videoId}
                        onClick={(e) => handleSongClick(e, song, feedData.biggestHits)}
                        className="flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-white/5 cursor-pointer transition"
                      >
                        <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden">
                          <SmartImage src={song.image} videoId={song.videoId} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-white">{song.title}</p>
                          <p className="truncate text-[11px] text-slate-400">{song.artist}</p>
                        </div>
                        {song.views && (
                          <span className="text-[10px] text-slate-500">{song.views}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* SCREEN: EXPLORE / SEARCH                                                  */}
      {/* ========================================================================= */}
      {activeTab === "explore" && (
        <main className="flex-1 px-4 py-4 space-y-4">
          <header>
            <h1 className="font-['Yatra_One'] text-2xl font-bold text-white">Explore Music</h1>
            <p className="text-xs text-slate-400">Search Bollywood songs, artists, albums, or lyrics</p>
          </header>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              placeholder="Search Hindi songs, Arijit Singh, Pritam..."
              className="w-full rounded-2xl bg-[#141519] py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 border border-white/10 focus:border-[#ff4f8a] focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Recent Searches (when query is empty) */}
          {!searchQuery && searchHistory.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Searches</span>
                <button
                  onClick={clearAllSearchHistory}
                  className="text-xs font-semibold text-pink-400 hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-1">
                {searchHistory.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSearchQuery(item);
                      handleSearchInputChange({ target: { value: item } } as any);
                    }}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs text-slate-200 bg-[#121317] hover:bg-[#1a1b22] cursor-pointer transition border border-white/5"
                  >
                    <span className="flex items-center gap-2.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {item}
                    </span>
                    <button
                      onClick={(e) => removeSearchHistoryItem(item, e)}
                      className="p-1 text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Suggestions dropdown pills */}
          {searchResults?.suggestions && searchResults.suggestions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {searchResults.suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSearchQuery(sug);
                    handleSearchInputChange({ target: { value: sug } } as any);
                  }}
                  className="shrink-0 rounded-full bg-[#1c1d24] px-3.5 py-1 text-xs text-slate-300 hover:bg-[#ff4f8a] hover:text-white transition border border-white/10"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Search Tabs */}
          {searchResults && (
            <div className="flex border-b border-white/10 text-xs font-bold">
              {(["all", "songs", "albums", "artists"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSearchTab(tab)}
                  className={`pb-2.5 px-4 uppercase tracking-wider transition ${
                    searchTab === tab
                      ? "border-b-2 border-[#ff4f8a] text-[#ff4f8a]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Search Loading Skeleton */}
          {isSearching && <SearchSkeleton />}

          {/* Search Results Display */}
          {searchResults && !isSearching && (
            <div className="space-y-4 pb-12">
              {/* Songs Tab / All */}
              {(searchTab === "all" || searchTab === "songs") && searchResults.songs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Songs</h3>
                  <div className="space-y-1.5">
                    {searchResults.songs.map((song) => (
                      <div
                        key={song.videoId}
                        onClick={(e) => handleSongClick(e, song, searchResults.songs)}
                        className="flex items-center gap-3 rounded-xl bg-[#121317] p-2.5 hover:bg-[#181920] cursor-pointer transition border border-white/5"
                      >
                        <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden">
                          <SmartImage src={song.image} videoId={song.videoId} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-white">{song.title}</p>
                          <p className="truncate text-[11px] text-slate-400">{song.artist}</p>
                        </div>
                        <span className="text-[11px] text-slate-500">{song.durationText}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(song);
                          }}
                          className="p-1.5 text-slate-400 hover:text-[#ff4f8a]"
                        >
                          <Heart
                            className={`h-4 w-4 ${likedIds.has(song.videoId) ? "fill-[#ff4f8a] text-[#ff4f8a]" : ""}`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Albums Tab / All */}
              {(searchTab === "all" || searchTab === "albums") && searchResults.albums.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Albums</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {searchResults.albums.map((album) => (
                      <div
                        key={album.albumId}
                        onClick={() => {
                          setSearchQuery(`${album.title} songs`);
                          handleSearchInputChange({ target: { value: `${album.title} songs` } } as any);
                        }}
                        className="space-y-2 rounded-2xl bg-[#121317] p-2.5 cursor-pointer hover:border-[#ff4f8a]/30 border border-white/5 transition"
                      >
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden">
                          <SmartImage src={album.image} />
                        </div>
                        <p className="truncate text-xs font-bold text-white">{album.title}</p>
                        <p className="truncate text-[11px] text-slate-400">{album.artist} • {album.year || "Album"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artists Tab / All */}
              {(searchTab === "all" || searchTab === "artists") && searchResults.artists.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Artists</h3>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {searchResults.artists.map((artist) => (
                      <div
                        key={artist.artistId}
                        onClick={() => {
                          setSearchQuery(`${artist.name} songs`);
                          handleSearchInputChange({ target: { value: `${artist.name} songs` } } as any);
                        }}
                        className="flex w-[110px] shrink-0 flex-col items-center text-center cursor-pointer group"
                      >
                        <div className="relative mb-2 h-20 w-20 overflow-hidden rounded-full border border-white/10 group-hover:border-[#ff4f8a] transition">
                          <SmartImage src={artist.image} className="rounded-full" />
                        </div>
                        <p className="truncate w-full text-xs font-bold text-white">{artist.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Moods & Moments Grid (when not searching) */}
          {!searchQuery && (
            <div className="space-y-4 pt-2 pb-12">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Moods & Genres</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Romance & Love", query: "Bollywood romantic love songs", color: "from-pink-600 to-rose-900" },
                  { label: "Party & Dance", query: "Bollywood dance party DJ songs", color: "from-purple-600 to-indigo-900" },
                  { label: "90s & 2000s Hits", query: "90s Bollywood evergreen classic songs", color: "from-amber-600 to-yellow-900" },
                  { label: "Sufi & Soulful", query: "Hindi sufi soulful unplugged songs", color: "from-teal-600 to-emerald-900" },
                  { label: "Chill & Lofi", query: "Hindi lofi remix chill acoustic", color: "from-blue-600 to-cyan-900" },
                  { label: "Workout & Gym", query: "Hindi workout gym high energy motivation", color: "from-red-600 to-orange-900" },
                  { label: "Sad & Heartbreak", query: "Hindi sad emotional heartbreak songs", color: "from-slate-700 to-zinc-900" },
                  { label: "Indie Hindi Vibes", query: "Indie Hindi acoustic pop trending", color: "from-fuchsia-600 to-pink-900" },
                ].map((mood, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSearchQuery(mood.query);
                      handleSearchInputChange({ target: { value: mood.query } } as any);
                    }}
                    className={`h-24 rounded-2xl bg-gradient-to-br ${mood.color} p-4 flex flex-col justify-between cursor-pointer shadow-lg hover:scale-105 transition-transform duration-200 border border-white/10`}
                  >
                    <span className="font-['Yatra_One'] text-sm font-bold text-white leading-tight">
                      {mood.label}
                    </span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-white/70">
                      Explore →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* SCREEN: LIBRARY                                                           */}
      {/* ========================================================================= */}
      {activeTab === "library" && (
        <main className="flex-1 px-4 py-4 space-y-5">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="font-['Yatra_One'] text-2xl font-bold text-white">Your Library</h1>
              <p className="text-xs text-slate-400">Saved tracks, playlists & offline cache</p>
            </div>
            <button
              onClick={() => setIsCreatePlaylistOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#ff4f8a] px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-[#ff3377] transition"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              New Playlist
            </button>
          </header>

          {libraryView === "main" ? (
            <div className="space-y-6 pb-12">
              {/* Smart Folders Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => openLibraryFolder("liked")}
                  className="h-28 rounded-2xl bg-gradient-to-br from-pink-600/30 to-[#141519] p-4 flex flex-col justify-between cursor-pointer border border-pink-500/20 hover:border-pink-500/50 transition shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <Heart className="h-6 w-6 text-[#ff4f8a] fill-[#ff4f8a]" />
                    <span className="text-xs font-bold text-pink-300">{librarySummary.liked} tracks</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Liked Songs</h3>
                    <p className="text-[10px] text-slate-400">PostgreSQL Persisted</p>
                  </div>
                </div>

                <div
                  onClick={() => openLibraryFolder("downloaded")}
                  className="h-28 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-[#141519] p-4 flex flex-col justify-between cursor-pointer border border-emerald-500/20 hover:border-emerald-500/50 transition shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <Download className="h-6 w-6 text-[#7dd3a5]" />
                    <span className="text-xs font-bold text-emerald-300">{librarySummary.downloaded} tracks</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Downloaded</h3>
                    <p className="text-[10px] text-slate-400">Offline MP3 Files</p>
                  </div>
                </div>

                <div
                  onClick={() => openLibraryFolder("history")}
                  className="h-28 rounded-2xl bg-gradient-to-br from-blue-600/30 to-[#141519] p-4 flex flex-col justify-between cursor-pointer border border-blue-500/20 hover:border-blue-500/50 transition shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <HistoryIcon className="h-6 w-6 text-blue-400" />
                    <span className="text-xs font-bold text-blue-300">{librarySummary.history} plays</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Listening History</h3>
                    <p className="text-[10px] text-slate-400">Recent Plays</p>
                  </div>
                </div>

                <div
                  onClick={() => openLibraryFolder("cached")}
                  className="h-28 rounded-2xl bg-gradient-to-br from-purple-600/30 to-[#141519] p-4 flex flex-col justify-between cursor-pointer border border-purple-500/20 hover:border-purple-500/50 transition shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <Disc className="h-6 w-6 text-purple-400" />
                    <span className="text-xs font-bold text-purple-300">{librarySummary.cached} cached</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Stream Cache</h3>
                    <p className="text-[10px] text-slate-400">Fast Playback</p>
                  </div>
                </div>
              </div>

              {/* Your Playlists */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Playlists</h3>
                </div>
                {playlists.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No playlists yet. Tap &ldquo;New Playlist&rdquo; to create one.</p>
                ) : (
                  <div className="space-y-2">
                    {playlists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => {
                          setSelectedPlaylist(pl);
                          setLibraryView("playlist");
                        }}
                        className="flex items-center justify-between rounded-xl bg-[#121317] p-3 hover:bg-[#181920] cursor-pointer transition border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff4f8a] to-purple-600">
                            <ListMusic className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{pl.name}</p>
                            <p className="text-[11px] text-slate-400">{pl.tracks.length} songs</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Folder Detail View
            <div className="space-y-4 pb-12">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setLibraryView("main")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  ← Back to Library
                </button>
                {libraryView === "history" && (
                  <button
                    onClick={clearHistoryData}
                    className="text-xs font-semibold text-rose-400 hover:underline"
                  >
                    Clear History
                  </button>
                )}
              </div>

              <h2 className="font-['Yatra_One'] text-xl font-bold text-white capitalize">
                {libraryView === "playlist" ? selectedPlaylist?.name : `${libraryView} Songs`}
              </h2>

              {/* Tracks List inside folder */}
              {libraryView === "history" ? (
                historyItems.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No listening history recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {historyItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={(e) =>
                          handleSongClick(e, {
                            videoId: item.videoId,
                            title: item.title,
                            artist: item.artist,
                            album: item.album,
                            duration: item.duration,
                            durationText: formatTime(item.duration),
                            image: item.image,
                            color: item.color,
                          })
                        }
                        className="flex items-center gap-3 rounded-xl bg-[#121317] p-2.5 hover:bg-[#181920] cursor-pointer transition border border-white/5"
                      >
                        <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden">
                          <SmartImage src={item.image} videoId={item.videoId} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-white">{item.title}</p>
                          <p className="truncate text-[11px] text-slate-400">{item.artist}</p>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.playedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : libraryView === "playlist" ? (
                selectedPlaylist?.tracks.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No tracks in this playlist yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPlaylist?.tracks.map((track) => (
                      <div
                        key={track.videoId}
                        onClick={(e) => handleSongClick(e, track, selectedPlaylist.tracks)}
                        className="flex items-center gap-3 rounded-xl bg-[#121317] p-2.5 hover:bg-[#181920] cursor-pointer transition border border-white/5"
                      >
                        <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden">
                          <SmartImage src={track.image} videoId={track.videoId} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-white">{track.title}</p>
                          <p className="truncate text-[11px] text-slate-400">{track.artist}</p>
                        </div>
                        <span className="text-[11px] text-slate-500">{track.durationText}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : libraryTracks.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No songs saved in this collection yet.</p>
              ) : (
                <div className="space-y-2">
                  {libraryTracks.map((track) => (
                    <div
                      key={track.videoId}
                      onClick={(e) => handleSongClick(e, track, libraryTracks)}
                      className="flex items-center gap-3 rounded-xl bg-[#121317] p-2.5 hover:bg-[#181920] cursor-pointer transition border border-white/5"
                    >
                      <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden">
                        <SmartImage src={track.image} videoId={track.videoId} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white">{track.title}</p>
                        <p className="truncate text-[11px] text-slate-400">{track.artist}</p>
                      </div>
                      <span className="text-[11px] text-slate-500">{track.durationText}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(track);
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#ff4f8a]"
                      >
                        <Heart
                          className={`h-4 w-4 ${likedIds.has(track.videoId) ? "fill-[#ff4f8a] text-[#ff4f8a]" : ""}`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* MINI PLAYER BAR (Fixed above Bottom Nav)                                 */}
      {/* ========================================================================= */}
      {currentTrack && (
        <div
          onClick={() => setIsPlayerOpen(true)}
          className="fixed bottom-[90px] left-0 right-0 z-40 mx-auto max-w-md px-3 cursor-pointer"
        >
          <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-[#17181f]/95 p-2 shadow-2xl backdrop-blur-xl border border-white/10">
            {/* Progress line indicator on top of mini bar */}
            <div
              className="absolute top-0 left-0 h-[2px] bg-[#ff4f8a] transition-all"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />

            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`relative h-11 w-11 shrink-0 rounded-full overflow-hidden shadow-md ${
                  isPlaying ? "animate-spin-slow" : ""
                }`}
              >
                <SmartImage src={currentTrack.image} videoId={currentTrack.videoId} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{currentTrack.title}</p>
                <p className="truncate text-[11px] text-slate-400">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => toggleLike(currentTrack)}
                className="p-2 text-slate-400 hover:text-[#ff4f8a] transition"
                aria-label="Like"
              >
                <Heart
                  className={`h-4 w-4 ${likedIds.has(currentTrack.videoId) ? "fill-[#ff4f8a] text-[#ff4f8a]" : ""}`}
                />
              </button>
              <button
                onClick={togglePlayPause}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff4f8a] text-white shadow-md hover:bg-[#ff3377] transition transform active:scale-95"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
              </button>
              <button
                onClick={playNext}
                className="p-2 text-slate-400 hover:text-white transition"
                aria-label="Next Track"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM NAVIGATION                                                         */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-[#08090b]/95 pb-safe backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          <button
            onClick={() => {
              setActiveTab("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex flex-col items-center gap-1 py-1 text-[11px] font-semibold transition ${
              activeTab === "home" ? "text-[#ff4f8a]" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <HomeIcon className="h-5 w-5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab("explore")}
            className={`flex flex-col items-center gap-1 py-1 text-[11px] font-semibold transition ${
              activeTab === "explore" ? "text-[#ff4f8a]" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="h-5 w-5" />
            <span>Explore</span>
          </button>

          <button
            onClick={() => setActiveTab("library")}
            className={`flex flex-col items-center gap-1 py-1 text-[11px] font-semibold transition ${
              activeTab === "library" ? "text-[#ff4f8a]" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LibraryIcon className="h-5 w-5" />
            <span>Library</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* FULL-SCREEN NOW PLAYING SCREEN                                           */}
      {/* ========================================================================= */}
      {isPlayerOpen && currentTrack && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-[#08090b] px-6 pt-safe pb-safe overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300"
        >
          {/* Ambient dominant background glow */}
          <div
            className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full blur-[140px] opacity-40 transition-all duration-700"
            style={{ backgroundColor: activeTrackColor }}
          />

          {/* Top Bar */}
          <header className="relative flex items-center justify-between py-3 z-10">
            <button
              onClick={() => setIsPlayerOpen(false)}
              className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Minimize Player"
            >
              <ChevronDown className="h-6 w-6" />
            </button>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Playing From</p>
              <p className="text-xs font-bold text-pink-300 truncate max-w-[200px]">
                {currentTrack.album || "Hindi Bollywood Stream"}
              </p>
            </div>
            <button
              onClick={() => setActiveOverlay("more")}
              className="rounded-full p-2 text-white hover:bg-white/10"
              aria-label="More Options"
            >
              <MoreVertical className="h-6 w-6" />
            </button>
          </header>

          {/* High-res Artwork Card */}
          <div className="relative my-auto flex flex-col items-center justify-center py-4 z-10">
            <div className="relative aspect-square w-full max-w-[320px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-glow">
              <SmartImage
                src={currentTrack.image}
                videoId={currentTrack.videoId}
                alt={currentTrack.title}
                className="h-full w-full"
              />
            </div>
          </div>

          {/* Track Details & Actions */}
          <div className="relative space-y-4 z-10 max-w-md mx-auto w-full">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-4">
                <h2 className="font-['Yatra_One'] text-2xl font-bold leading-tight text-white line-clamp-1">
                  {currentTrack.title}
                </h2>
                <p
                  onClick={() => {
                    setIsPlayerOpen(false);
                    setActiveTab("explore");
                    setSearchQuery(currentTrack.artist);
                    handleSearchInputChange({ target: { value: currentTrack.artist } } as any);
                  }}
                  className="text-sm font-medium text-pink-300 truncate cursor-pointer hover:underline"
                >
                  {currentTrack.artist}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleLike(currentTrack)}
                  className="rounded-full p-2.5 text-slate-300 hover:text-white hover:bg-white/10"
                  aria-label="Like"
                >
                  <Heart
                    className={`h-6 w-6 ${likedIds.has(currentTrack.videoId) ? "fill-[#ff4f8a] text-[#ff4f8a]" : ""}`}
                  />
                </button>
              </div>
            </div>

            {/* Custom 3px Progress Range */}
            <div className="space-y-1.5">
              <div
                className="custom-progress-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  handleSeek(pos * (duration || 1));
                }}
              >
                <div
                  className="custom-progress-fill"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                />
                <div
                  className="custom-progress-thumb"
                  style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                className="p-2 text-slate-400 hover:text-white transition"
                aria-label="Back 10 seconds"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={playPrevious}
                className="p-2 text-white hover:text-[#ff4f8a] transition"
                aria-label="Previous Track"
              >
                <SkipBack className="h-7 w-7 fill-white" />
              </button>

              {/* Scalloped Glowing Play/Pause Button */}
              <button
                onClick={togglePlayPause}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4f8a] to-[#ff3377] text-white shadow-xl shadow-[#ff4f8a]/50 hover:scale-105 active:scale-95 transition-all"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7 fill-white" />
                ) : (
                  <Play className="h-7 w-7 fill-white ml-1" />
                )}
              </button>

              <button
                onClick={playNext}
                className="p-2 text-white hover:text-[#ff4f8a] transition"
                aria-label="Next Track"
              >
                <SkipForward className="h-7 w-7 fill-white" />
              </button>

              <button
                onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
                className="p-2 text-slate-400 hover:text-white transition"
                aria-label="Forward 10 seconds"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Bottom 5 Small 42px Chips Toolbar + White ⋮ pushed right */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                {/* 1. Queue */}
                <button
                  onClick={() => setActiveOverlay("queue")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#14151a] text-slate-300 hover:bg-white/10 hover:text-white border border-white/10 relative"
                  aria-label="Open Queue"
                >
                  <ListMusic className="h-4 w-4" />
                  {queue.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff4f8a] text-[9px] font-bold text-white">
                      {queue.length}
                    </span>
                  )}
                </button>

                {/* 2. Lyrics */}
                <button
                  onClick={() => setActiveOverlay("lyrics")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#14151a] text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
                  aria-label="Open Lyrics"
                >
                  <FileText className="h-4 w-4" />
                </button>

                {/* 3. Sleep Timer */}
                <button
                  onClick={() => setActiveOverlay("sleep")}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    sleepTimerActive
                      ? "bg-[#ff4f8a] border-[#ff4f8a] text-white"
                      : "bg-[#14151a] border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-label="Open Sleep Timer"
                >
                  <Clock className="h-4 w-4" />
                </button>

                {/* 4. Shuffle (Toggle visual only) */}
                <button
                  onClick={() => {
                    setIsShuffle((prev) => !prev);
                    showToast(!isShuffle ? "Shuffle On" : "Shuffle Off");
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    isShuffle
                      ? "bg-[#ff4f8a] border-[#ff4f8a] text-white"
                      : "bg-[#14151a] border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-label="Toggle Shuffle"
                >
                  <Shuffle className="h-4 w-4" />
                </button>

                {/* 5. Repeat (Cycle off / all / one) */}
                <button
                  onClick={() => {
                    const next = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
                    setRepeatMode(next);
                    showToast(`Repeat: ${next.toUpperCase()}`);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    repeatMode !== "off"
                      ? "bg-[#ff4f8a] border-[#ff4f8a] text-white"
                      : "bg-[#14151a] border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-label="Toggle Repeat"
                >
                  {repeatMode === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </button>
              </div>

              {/* White More ⋮ button pushed right */}
              <button
                onClick={() => setActiveOverlay("more")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-slate-200 transition"
                aria-label="More Options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4 FULL-SCREEN OVERLAYS (Slide up translateY 100% -> 0 in 340ms)          */}
      {/* ========================================================================= */}

      {/* 1. LYRICS OVERLAY */}
      {activeOverlay === "lyrics" && currentTrack && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0b0c10] px-6 pt-safe pb-safe overlay-drawer"
        >
          <header className="flex items-center justify-between py-3 border-b border-white/10">
            <button
              onClick={() => setActiveOverlay(null)}
              className="rounded-full p-2 text-slate-400 hover:text-white"
              aria-label="Close Lyrics"
            >
              <ChevronDown className="h-6 w-6" />
            </button>
            <div className="text-center">
              <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Lyrics</h3>
              <p className="text-xs text-pink-300 line-clamp-1">{currentTrack.title}</p>
            </div>
            <div className="w-10" />
          </header>

          <div
            ref={lyricsContainerRef}
            className="flex-1 overflow-y-auto py-8 text-center space-y-6 no-scrollbar"
          >
            {isLoadingLyrics ? (
              <div className="py-20 text-slate-400 text-sm animate-pulse">
                Fetching lyrics from YouTube Music...
              </div>
            ) : lyricsData?.lyrics && lyricsData.lyrics.length > 0 ? (
              lyricsData.lyrics.map((line, idx) => {
                const isCurrentLine =
                  line.time !== undefined &&
                  currentTime >= line.time &&
                  (idx === lyricsData.lyrics.length - 1 ||
                    (lyricsData.lyrics[idx + 1].time !== undefined &&
                      currentTime < (lyricsData.lyrics[idx + 1].time || 0)));

                return (
                  <p
                    key={idx}
                    onClick={() => {
                      if (line.time !== undefined) {
                        handleSeek(line.time);
                      }
                    }}
                    className={`cursor-pointer transition-all duration-300 font-medium ${
                      isCurrentLine
                        ? "active-lyric-line font-['Yatra_One'] text-2xl font-bold text-white scale-110 drop-shadow-[0_0_15px_rgba(255,79,138,0.8)]"
                        : "text-base text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })
            ) : (
              <p className="py-20 text-slate-500 text-sm">No lyrics available for this track.</p>
            )}
          </div>

          <footer className="py-4 text-center text-xs text-slate-500 border-t border-white/10">
            Tap any line to jump to that moment in the track
          </footer>
        </div>
      )}

      {/* 2. SLEEP TIMER OVERLAY */}
      {activeOverlay === "sleep" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0b0c10] px-6 pt-safe pb-safe overlay-drawer"
        >
          <header className="flex items-center justify-between py-3 border-b border-white/10">
            <button
              onClick={() => setActiveOverlay(null)}
              className="rounded-full p-2 text-slate-400 hover:text-white"
              aria-label="Close Sleep Timer"
            >
              <ChevronDown className="h-6 w-6" />
            </button>
            <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Sleep Timer</h3>
            <div className="w-10" />
          </header>

          <div className="my-auto space-y-8 max-w-md mx-auto w-full py-6">
            <div className="text-center space-y-2">
              <span className="font-['Yatra_One'] text-5xl font-extrabold text-[#ff4f8a]">
                {sleepTimerActive && sleepSecondsLeft !== null
                  ? `${Math.floor(sleepSecondsLeft / 60)}m ${sleepSecondsLeft % 60}s`
                  : `${sleepMinutes} min`}
              </span>
              <p className="text-xs text-slate-400">
                {sleepTimerActive ? "Playback will pause automatically" : "Slide to adjust duration"}
              </p>
            </div>

            {/* Slider 1-120 min */}
            <div className="space-y-3">
              <input
                type="range"
                min="1"
                max="120"
                value={sleepMinutes}
                onChange={(e) => setSleepMinutes(Number(e.target.value))}
                className="w-full accent-[#ff4f8a] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                <span>1 min</span>
                <span>30 min</span>
                <span>60 min</span>
                <span>120 min</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2 justify-center">
              {[15, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSleepMinutes(mins)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    sleepMinutes === mins
                      ? "bg-[#ff4f8a] text-white"
                      : "bg-[#16171d] text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* End of current song toggle */}
            <div className="flex items-center justify-between rounded-2xl bg-[#141519] p-4 border border-white/5">
              <div>
                <p className="text-xs font-bold text-white">End of current song</p>
                <p className="text-[11px] text-slate-400">Stop playback when this track finishes</p>
              </div>
              <button
                onClick={() => setSleepEndOfSong((prev) => !prev)}
                className={`flex h-6 w-11 items-center rounded-full p-1 transition ${
                  sleepEndOfSong ? "bg-[#ff4f8a]" : "bg-slate-700"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white transition-transform ${
                    sleepEndOfSong ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <footer className="space-y-2 py-4">
            {sleepTimerActive ? (
              <button
                onClick={() => {
                  setSleepTimerActive(false);
                  setSleepSecondsLeft(null);
                  showToast("Sleep timer cancelled");
                  setActiveOverlay(null);
                }}
                className="w-full rounded-2xl bg-rose-600/30 py-3.5 text-sm font-bold text-rose-400 border border-rose-500/40 hover:bg-rose-600/50 transition"
              >
                Cancel Active Timer
              </button>
            ) : (
              <button
                onClick={() => {
                  setSleepTimerActive(true);
                  setSleepSecondsLeft(sleepMinutes * 60);
                  showToast(`Sleep timer set for ${sleepMinutes} minutes`);
                  setActiveOverlay(null);
                }}
                className="w-full rounded-2xl bg-[#ff4f8a] py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff4f8a]/40 hover:bg-[#ff3377] transition"
              >
                Start Timer ({sleepMinutes}m)
              </button>
            )}
          </footer>
        </div>
      )}

      {/* 3. QUEUE OVERLAY */}
      {activeOverlay === "queue" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0b0c10] px-6 pt-safe pb-safe overlay-drawer"
        >
          <header className="flex items-center justify-between py-3 border-b border-white/10">
            <button
              onClick={() => setActiveOverlay(null)}
              className="rounded-full p-2 text-slate-400 hover:text-white"
              aria-label="Close Queue"
            >
              <ChevronDown className="h-6 w-6" />
            </button>
            <div className="text-center">
              <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Playback Queue</h3>
              <p className="text-xs text-slate-400">{queue.length} songs</p>
            </div>
            <button
              onClick={() => {
                if (currentTrack) setQueue([currentTrack]);
                showToast("Cleared queue");
              }}
              className="text-xs font-semibold text-rose-400 hover:underline"
            >
              Clear
            </button>
          </header>

          <div className="flex-1 overflow-y-auto py-4 space-y-2 no-scrollbar">
            {queue.map((song, i) => {
              const isCurrent = i === queueIndex;
              return (
                <div
                  key={`${song.videoId}-${i}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setQueueIndex(i);
                    playTrack(song);
                  }}
                  className={`flex items-center gap-3 rounded-xl p-2.5 cursor-pointer transition ${
                    isCurrent
                      ? "bg-[#ff4f8a]/20 border border-[#ff4f8a]/50"
                      : "bg-[#121317] hover:bg-[#181920] border border-white/5"
                  }`}
                >
                  <span className="w-5 text-center text-xs font-bold text-slate-500">{i + 1}</span>
                  <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden">
                    <SmartImage src={song.image} videoId={song.videoId} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-bold ${isCurrent ? "text-[#ff4f8a]" : "text-white"}`}>
                      {song.title}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">{song.artist}</p>
                  </div>
                  <span className="text-[11px] text-slate-500">{song.durationText}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setQueue((prev) => prev.filter((_, idx) => idx !== i));
                      showToast(`Removed "${song.title}" from queue`);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <footer className="py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Autoplay related Hindi songs</span>
            <span className="font-bold text-[#ff4f8a]">Enabled</span>
          </footer>
        </div>
      )}

      {/* 4. MORE OPTIONS OVERLAY (10 Actions) */}
      {activeOverlay === "more" && currentTrack && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-md overlay-drawer"
          onClick={() => setActiveOverlay(null)}
        >
          <div
            className="rounded-t-3xl bg-[#14151a] p-6 max-h-[85vh] overflow-y-auto no-scrollbar space-y-4 border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 pb-2 border-b border-white/10">
              <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden shadow-md">
                <SmartImage src={currentTrack.image} videoId={currentTrack.videoId} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-['Yatra_One'] text-base font-bold text-white">{currentTrack.title}</h3>
                <p className="truncate text-xs text-pink-300">{currentTrack.artist}</p>
              </div>
              <button
                onClick={() => setActiveOverlay(null)}
                className="rounded-full p-2 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 text-sm font-medium">
              {/* 1. Download */}
              <button
                onClick={() => {
                  setActiveOverlay(null);
                  handleDownload(currentTrack);
                }}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-slate-200 hover:bg-white/10 transition"
              >
                <Download className="h-5 w-5 text-[#7dd3a5]" />
                <span>Download Offline MP3</span>
              </button>

              {/* 2. Add to Playlist */}
              <button
                onClick={() => {
                  setActiveOverlay(null);
                  setIsAddToPlaylistOpen(true);
                }}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-slate-200 hover:bg-white/10 transition"
              >
                <FolderPlus className="h-5 w-5 text-[#ff4f8a]" />
                <span>Add to Playlist</span>
              </button>

              {/* 3. View Artist */}
              <button
                onClick={() => {
                  setActiveOverlay(null);
                  setIsPlayerOpen(false);
                  setActiveTab("explore");
                  setSearchQuery(currentTrack.artist);
                  handleSearchInputChange({ target: { value: currentTrack.artist } } as any);
                }}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-slate-200 hover:bg-white/10 transition"
              >
                <Users className="h-5 w-5 text-blue-400" />
                <span>View Artist ({currentTrack.artist})</span>
              </button>

              {/* 4. View Album */}
              <button
                onClick={() => {
                  setActiveOverlay(null);
                  setIsPlayerOpen(false);
                  setActiveTab("explore");
                  setSearchQuery(currentTrack.album || currentTrack.title);
                  handleSearchInputChange({ target: { value: currentTrack.album || currentTrack.title } } as any);
                }}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-slate-200 hover:bg-white/10 transition"
              >
                <Disc className="h-5 w-5 text-purple-400" />
                <span>View Album ({currentTrack.album || "Single"})</span>
              </button>

              {/* 5. Equalizer */}
              <button
                onClick={() => {
                  setActiveOverlay(null);
                  setIsEqualizerOpen(true);
                }}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-slate-200 hover:bg-white/10 transition"
              >
                <Sliders className="h-5 w-5 text-amber-400" />
                <span>Equalizer Presets ({eqPreset.toUpperCase()})</span>
              </button>

              {/* 6. Sleep Timer */}
              <button
                onClick={() => setActiveOverlay("sleep")}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-slate-200 hover:bg-white/10 transition"
              >
                <Clock className="h-5 w-5 text-teal-400" />
                <span>Set Sleep Timer</span>
              </button>

              {/* 7. Share */}
              <button
                onClick={() => {
                  setActiveOverlay(null);
                  navigator.clipboard?.writeText(window.location.href);
                  showToast("Song link copied to clipboard!");
                }}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-slate-200 hover:bg-white/10 transition"
              >
                <Share2 className="h-5 w-5 text-pink-400" />
                <span>Share Song</span>
              </button>

              {/* 8. Credits */}
              <button
                onClick={() => {
                  setActiveOverlay(null);
                  setIsSongInfoOpen(true);
                }}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-slate-200 hover:bg-white/10 transition"
              >
                <Info className="h-5 w-5 text-cyan-400" />
                <span>Song Audio Info & Credits</span>
              </button>

              {/* 9. High Quality Mode */}
              <button
                onClick={() => {
                  setActiveOverlay(null);
                  showToast("High Quality Audio (320kbps mode) active");
                }}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-slate-200 hover:bg-white/10 transition"
              >
                <Sparkles className="h-5 w-5 text-yellow-400" />
                <span>Stream Quality: 320 kbps (HQ)</span>
              </button>

              {/* 10. Refresh Song Source */}
              <button
                onClick={() => {
                  setActiveOverlay(null);
                  handlePlayerError(150);
                }}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-rose-400 hover:bg-rose-500/10 transition"
              >
                <RotateCw className="h-5 w-5 text-rose-400" />
                <span>Switch / Resolve Audio Source</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE PLAYLIST                                                   */}
      {/* ========================================================================= */}
      {isCreatePlaylistOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsCreatePlaylistOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#14151a] p-6 space-y-4 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-['Yatra_One'] text-xl font-bold text-white">Create New Playlist</h3>
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full rounded-xl bg-[#1c1e24] px-4 py-3 text-sm text-white placeholder:text-slate-500 border border-white/10 focus:border-[#ff4f8a] focus:outline-none"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newPlaylistDesc}
              onChange={(e) => setNewPlaylistDesc(e.target.value)}
              className="w-full rounded-xl bg-[#1c1e24] px-4 py-3 text-sm text-white placeholder:text-slate-500 border border-white/10 focus:border-[#ff4f8a] focus:outline-none"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsCreatePlaylistOpen(false)}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={createPlaylist}
                className="flex-1 rounded-xl bg-[#ff4f8a] py-2.5 text-xs font-bold text-white hover:bg-[#ff3377]"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD TO PLAYLIST                                                   */}
      {/* ========================================================================= */}
      {isAddToPlaylistOpen && currentTrack && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsAddToPlaylistOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#14151a] p-6 space-y-4 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-['Yatra_One'] text-xl font-bold text-white">Add to Playlist</h3>
              <button onClick={() => setIsAddToPlaylistOpen(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => addTrackToPlaylist(pl.id, currentTrack)}
                  className="flex items-center justify-between rounded-xl bg-[#1c1e24] p-3 hover:bg-white/10 cursor-pointer transition"
                >
                  <span className="text-xs font-bold text-white">{pl.name}</span>
                  <span className="text-[10px] text-slate-400">{pl.tracks.length} songs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EQUALIZER PRESETS                                                 */}
      {/* ========================================================================= */}
      {isEqualizerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsEqualizerOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#14151a] p-6 space-y-4 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-['Yatra_One'] text-xl font-bold text-white">Audio Equalizer</h3>
            <p className="text-xs text-slate-400">Tailored DSP presets for Bollywood acoustics</p>

            <div className="space-y-2">
              {(["bass", "vocal", "acoustic", "party", "flat"] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setEqPreset(preset);
                    showToast(`Equalizer set to: ${preset.toUpperCase()}`);
                    setIsEqualizerOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-xs font-bold transition ${
                    eqPreset === preset
                      ? "bg-[#ff4f8a] text-white"
                      : "bg-[#1c1e24] text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span className="capitalize">{preset} Profile</span>
                  {eqPreset === preset && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SONG CREDITS & INFO                                               */}
      {/* ========================================================================= */}
      {isSongInfoOpen && currentTrack && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsSongInfoOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#14151a] p-6 space-y-4 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Song Credits</h3>
              <button onClick={() => setIsSongInfoOpen(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <p className="text-slate-500 uppercase text-[10px] font-bold">Track Title</p>
                <p className="font-bold text-white">{currentTrack.title}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] font-bold">Performers / Artists</p>
                <p className="font-bold text-white">{currentTrack.artist}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] font-bold">Album / Release</p>
                <p className="font-bold text-white">{currentTrack.album || "Single Track"}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] font-bold">Duration & Engine</p>
                <p className="font-bold text-white">{currentTrack.durationText} • YouTube IFrame Engine</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CAST DEVICE SIMULATION                                            */}
      {/* ========================================================================= */}
      {isCastOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsCastOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#14151a] p-6 space-y-4 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Connect to Device</h3>
              <button onClick={() => setIsCastOpen(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-[#ff4f8a]/20 p-3 border border-[#ff4f8a]/40">
                <span className="font-bold text-white">This Device (Beatly Web Client)</span>
                <Check className="h-4 w-4 text-[#ff4f8a]" />
              </div>
              <div
                onClick={() => {
                  showToast("Connected to Living Room TV (Cast)");
                  setIsCastOpen(false);
                }}
                className="flex items-center justify-between rounded-xl bg-[#1c1e24] p-3 hover:bg-white/10 cursor-pointer"
              >
                <span className="text-slate-300">Living Room TV (AirPlay / Cast)</span>
              </div>
              <div
                onClick={() => {
                  showToast("Connected to Bluetooth Audio Speaker");
                  setIsCastOpen(false);
                }}
                className="flex items-center justify-between rounded-xl bg-[#1c1e24] p-3 hover:bg-white/10 cursor-pointer"
              >
                <span className="text-slate-300">Bluetooth Hi-Fi System</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMMUNITY VIBES                                                   */}
      {/* ========================================================================= */}
      {isCommunityOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsCommunityOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#14151a] p-6 space-y-4 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-['Yatra_One'] text-lg font-bold text-white">Beatly Community</h3>
              <button onClick={() => setIsCommunityOpen(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Thousands of Bollywood music lovers discover unreleased gems, remixes, and acoustic covers daily.
            </p>
            <div className="rounded-2xl bg-[#1c1e24] p-3 space-y-1.5 text-xs">
              <p className="font-bold text-pink-300">🔥 Trending this week</p>
              <p className="text-slate-300">Arijit Singh &amp; Pritam Unplugged Medleys, Coke Studio Season 15, and 90s Lofi Re-imaginations.</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: SETTINGS                                                          */}
      {/* ========================================================================= */}
      {isSettingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-md"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="rounded-t-3xl bg-[#14151a] p-6 max-h-[85vh] overflow-y-auto no-scrollbar space-y-4 border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-['Yatra_One'] text-xl font-bold text-white">Settings &amp; About</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-[#1c1e24] p-3">
                <div>
                  <p className="font-bold text-white">Regional Bias</p>
                  <p className="text-[11px] text-slate-400">India (GL: &quot;IN&quot;, HL: &quot;en&quot;)</p>
                </div>
                <span className="font-bold text-[#ff4f8a]">Locked (Hindi)</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#1c1e24] p-3">
                <div>
                  <p className="font-bold text-white">Audio Playback Engine</p>
                  <p className="text-[11px] text-slate-400">YouTube IFrame Player (Hidden 240px host)</p>
                </div>
                <span className="font-bold text-[#7dd3a5]">Active</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#1c1e24] p-3">
                <div>
                  <p className="font-bold text-white">PostgreSQL Persistence</p>
                  <p className="text-[11px] text-slate-400">Saved tracks &amp; listening history</p>
                </div>
                <span className="font-bold text-[#7dd3a5]">Connected</span>
              </div>

              <button
                onClick={() => {
                  localStorage.clear();
                  showToast("Local cache reset");
                  setIsSettingsOpen(false);
                }}
                className="w-full rounded-xl bg-rose-600/20 p-3 text-left font-bold text-rose-400 hover:bg-rose-600/30 transition"
              >
                Clear Local Data &amp; Reset Playlists
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
