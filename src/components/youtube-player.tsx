"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface YouTubePlayerHandle {
  load: (videoId: string, autoplay?: boolean) => void;
  /** Resolves when playback actually starts, rejects if the browser blocks it. */
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

interface YouTubePlayerProps {
  initialVideoId?: string;
  onPlayingChange?: (isPlaying: boolean) => void;
  onTimeChange?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (errorCode: number) => void;
  onReady?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    __echoYTReady?: Promise<void>;
  }
}

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  if (window.__echoYTReady) {
    return window.__echoYTReady;
  }

  window.__echoYTReady = new Promise<void>((resolve) => {
    const existingScript = document.querySelector('script[src*="iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") {
        try {
          previousCallback();
        } catch (e) {
          console.warn("Previous onYouTubeIframeAPIReady error:", e);
        }
      }
      resolve();
    };

    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, 10000);
  });

  return window.__echoYTReady;
}

/** Android WebView wrappers (HopWeb, Median, GoNative…) contain "; wv)". */
function detectBlockedWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /; wv\)/.test(ua) || /HopWeb/i.test(ua);
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer(
    {
      initialVideoId = "BddP6PYo2gs",
      onPlayingChange,
      onTimeChange,
      onEnded,
      onError,
      onReady,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const engineRef = useRef<"yt" | "html5">("yt");
    // Sticky flag: once the iframe proves unusable (blocked WebView / embed
    // error), skip it for the rest of the session and go straight to HTML5.
    const ytBlockedRef = useRef<boolean>(false);
    const isPlayerReadyRef = useRef<boolean>(false);
    const currentVideoIdRef = useRef<string>(initialVideoId);
    const pendingRef = useRef<{ videoId: string; autoplay: boolean } | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const watchdogRef = useRef<NodeJS.Timeout | null>(null);
    const playRetryRef = useRef<NodeJS.Timeout | null>(null);
    // Captured once so the construction effect never re-runs on track change.
    const initialVideoIdRef = useRef<string>(initialVideoId);

    const callbacksRef = useRef({
      onPlayingChange,
      onTimeChange,
      onEnded,
      onError,
      onReady,
    });

    useEffect(() => {
      callbacksRef.current = {
        onPlayingChange,
        onTimeChange,
        onEnded,
        onError,
        onReady,
      };
    });

    // ── HTML5 fallback engine helpers ─────────────────────────────────────
    const clearWatchdog = () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };

    const startHtml5Engine = (videoId: string, autoplay: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;

      engineRef.current = "html5";
      clearWatchdog();
      if (playRetryRef.current) {
        clearInterval(playRetryRef.current);
        playRetryRef.current = null;
      }

      const src = `/api/music/stream/${videoId}?t=${Date.now()}`;
      // Synchronous swap — mirrors `audio.src = url;` from the click tick.
      audio.src = src;
      audio.load();

      if (autoplay) {
        // If the stream redirect takes a moment, attempt play on canplay too.
        const tryPlay = () => {
          try {
            const p = audio.play();
            if (p && typeof p.then === "function") {
              p.then(() => {
                callbacksRef.current.onPlayingChange?.(true);
              }).catch((error: unknown) => {
                console.error("Playback blocked by browser strict policy:", error);
                callbacksRef.current.onPlayingChange?.(false);
              });
            }
          } catch (err) {
            console.error("Playback blocked by browser strict policy:", err);
            callbacksRef.current.onPlayingChange?.(false);
          }
        };

        if (audio.readyState >= 2) {
          tryPlay();
        } else {
          audio.addEventListener("canplay", tryPlay, { once: true });
          // Hard cap: if the stream never becomes playable, surface an error
          // so the app's resolve/next-track recovery kicks in.
          setTimeout(() => {
            if (engineRef.current === "html5" && audio.paused && audio.currentTime === 0) {
              audio.removeEventListener("canplay", tryPlay);
              callbacksRef.current.onPlayingChange?.(false);
              callbacksRef.current.onError?.(150);
            }
          }, 10000);
        }
      }
    };

    const armWatchdog = (videoId: string) => {
      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        if (engineRef.current === "yt") {
          console.warn(
            "YouTube IFrame engine did not start playback; switching to HTML5 stream fallback."
          );
          ytBlockedRef.current = true;
          startHtml5Engine(videoId, true);
        }
      }, 6000);
    };

    // ── Imperative API ────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      /**
       * MUST be called synchronously inside a user gesture (onClick).
       * Swaps the source and starts playback immediately — no awaits.
       */
      load: (videoId: string, autoplay: boolean = true) => {
        if (!videoId) return;
        currentVideoIdRef.current = videoId;

        // If the iframe is known-bad on this device, go straight to HTML5.
        if (ytBlockedRef.current) {
          startHtml5Engine(videoId, autoplay);
          return;
        }

        if (isPlayerReadyRef.current && playerRef.current) {
          engineRef.current = "yt";
          try {
            const request = { videoId, suggestedQuality: "hd1080" as const };
            if (autoplay) {
              playerRef.current.loadVideoById?.(request);
              playerRef.current.playVideo?.();
              armWatchdog(videoId);
            } else {
              playerRef.current.cueVideoById?.(request);
            }
          } catch (err) {
            console.error("Playback blocked by browser strict policy:", err);
            ytBlockedRef.current = true;
            startHtml5Engine(videoId, autoplay);
          }
        } else {
          pendingRef.current = { videoId, autoplay };
          if (autoplay) armWatchdog(videoId);
        }
      },

      play: (): Promise<void> => {
        if (engineRef.current === "html5") {
          const audio = audioRef.current;
          if (!audio) return Promise.reject(new Error("Audio engine unavailable"));
          try {
            const p = audio.play();
            return p && typeof p.then === "function"
              ? p.then(() => undefined)
              : Promise.resolve();
          } catch (err) {
            return Promise.reject(err);
          }
        }

        if (!isPlayerReadyRef.current || !playerRef.current?.playVideo) {
          return Promise.reject(new Error("Player not ready"));
        }
        try {
          playerRef.current.playVideo();
        } catch (err) {
          return Promise.reject(err);
        }
        return new Promise<void>((resolve, reject) => {
          const started = Date.now();
          const check = setInterval(() => {
            const state = playerRef.current?.getPlayerState?.();
            if (state === 1) {
              clearInterval(check);
              resolve();
            } else if (Date.now() - started > 3000) {
              clearInterval(check);
              reject(new DOMException("Playback did not start", "NotAllowedError"));
            }
          }, 100);
        });
      },

      pause: () => {
        if (engineRef.current === "html5") {
          audioRef.current?.pause();
          return;
        }
        if (isPlayerReadyRef.current && playerRef.current?.pauseVideo) {
          try {
            playerRef.current.pauseVideo();
          } catch (err) {
            console.error("Player pauseVideo error:", err);
          }
        }
      },

      seek: (seconds: number) => {
        if (engineRef.current === "html5") {
          const audio = audioRef.current;
          if (audio && isFinite(seconds)) {
            try {
              audio.currentTime = seconds;
            } catch {}
          }
          return;
        }
        if (isPlayerReadyRef.current && playerRef.current?.seekTo) {
          try {
            playerRef.current.seekTo(seconds, true);
          } catch (err) {
            console.error("Player seekTo error:", err);
          }
        }
      },

      setVolume: (volume: number) => {
        const v = Math.max(0, Math.min(100, volume));
        if (engineRef.current === "html5") {
          if (audioRef.current) audioRef.current.volume = v / 100;
          return;
        }
        if (isPlayerReadyRef.current && playerRef.current?.setVolume) {
          try {
            playerRef.current.setVolume(v);
          } catch (err) {
            console.error("Player setVolume error:", err);
          }
        }
      },
    }));

    // ── HTML5 <audio> element: pre-initialized once on mount ─────────────
    useEffect(() => {
      const audio = new Audio();
      audio.preload = "auto";
      audio.setAttribute("playsinline", "true");
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      const onPlay = () => {
        clearWatchdog();
        callbacksRef.current.onPlayingChange?.(true);
      };
      const onPause = () => callbacksRef.current.onPlayingChange?.(false);
      const onEndedEv = () => {
        callbacksRef.current.onPlayingChange?.(false);
        callbacksRef.current.onEnded?.();
      };
      const onErrorEv = () => {
        if (engineRef.current !== "html5" || !audio.src) return;
        console.error("HTML5 audio stream failed; requesting app-level recovery.");
        clearWatchdog();
        callbacksRef.current.onPlayingChange?.(false);
        // Reuse the app's embed-error recovery (resolve candidates / next).
        callbacksRef.current.onError?.(150);
      };

      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("ended", onEndedEv);
      audio.addEventListener("error", onErrorEv);

      // Detect a blocked WebView up-front so the very first tap never waits.
      if (detectBlockedWebView()) {
        ytBlockedRef.current = true;
      }

      return () => {
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("ended", onEndedEv);
        audio.removeEventListener("error", onErrorEv);
        audio.pause();
        audio.removeAttribute("src");
        audioRef.current = null;
      };
    }, []);

    // ── YouTube IFrame engine: mounts exactly once ───────────────────────
    useEffect(() => {
      let isMounted = true;

      if (playerRef.current) return;

      loadYouTubeIframeApi().then(() => {
        if (!isMounted || !containerRef.current || !window.YT || !window.YT.Player) {
          return;
        }
        if (playerRef.current) return;

        containerRef.current.innerHTML = "";
        const playerDiv = document.createElement("div");
        containerRef.current.appendChild(playerDiv);

        try {
          playerRef.current = new window.YT.Player(playerDiv, {
            width: "240",
            height: "240",
            videoId: initialVideoIdRef.current,
            playerVars: {
              controls: 0,
              disablekb: 1,
              fs: 0,
              playsinline: 1,
              rel: 0,
              origin: typeof window !== "undefined" ? window.location.origin : undefined,
            },
            events: {
              onReady: () => {
                if (!isMounted) return;
                isPlayerReadyRef.current = true;
                try {
                  playerRef.current?.setPlaybackQuality?.("hd1080");
                } catch {}
                callbacksRef.current.onReady?.();

                if (pendingRef.current && playerRef.current) {
                  const { videoId, autoplay } = pendingRef.current;
                  pendingRef.current = null;
                  const request = { videoId, suggestedQuality: "hd1080" as const };
                  if (autoplay && !ytBlockedRef.current) {
                    engineRef.current = "yt";
                    playerRef.current.loadVideoById?.(request);
                    playerRef.current.playVideo?.();
                    armWatchdog(videoId);
                  } else if (autoplay) {
                    startHtml5Engine(videoId, true);
                  } else {
                    playerRef.current.cueVideoById?.(request);
                  }
                }
              },
              onStateChange: (event: { data: number }) => {
                if (!isMounted || engineRef.current !== "yt") return;
                const state = event.data;
                if (state === 1) {
                  clearWatchdog();
                  callbacksRef.current.onPlayingChange?.(true);
                } else if (state === 2 || state === 5) {
                  callbacksRef.current.onPlayingChange?.(false);
                } else if (state === 0) {
                  callbacksRef.current.onPlayingChange?.(false);
                  callbacksRef.current.onEnded?.();
                }
              },
              onError: (event: { data: number }) => {
                if (!isMounted) return;
                console.warn("YouTube Player error event code:", event.data);
                clearWatchdog();
                // Try the direct stream for the same video before giving up.
                if (currentVideoIdRef.current && engineRef.current === "yt") {
                  ytBlockedRef.current = true;
                  startHtml5Engine(currentVideoIdRef.current, true);
                } else {
                  callbacksRef.current.onError?.(event.data);
                }
              },
            },
          });
        } catch (err) {
          console.error("Failed to construct YT.Player:", err);
        }
      });

      // Poll current time / duration every 500ms from the active engine.
      pollIntervalRef.current = setInterval(() => {
        if (engineRef.current === "html5") {
          const a = audioRef.current;
          if (a) {
            callbacksRef.current.onTimeChange?.(a.currentTime || 0, a.duration || 0);
          }
          return;
        }
        if (isPlayerReadyRef.current && playerRef.current) {
          try {
            const currentTime = playerRef.current.getCurrentTime?.() || 0;
            const duration = playerRef.current.getDuration?.() || 0;
            callbacksRef.current.onTimeChange?.(currentTime, duration);
          } catch {
            // Ignore polling errors during player transitions
          }
        }
      }, 500);

      return () => {
        isMounted = false;
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (playRetryRef.current) clearInterval(playRetryRef.current);
        clearWatchdog();
        if (playerRef.current?.destroy) {
          try {
            playerRef.current.destroy();
          } catch {
            // Player cleanup
          }
        }
        isPlayerReadyRef.current = false;
        playerRef.current = null;
      };
      // Mount-once: never rebuild the iframe when the track changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        className="youtube-engine"
        ref={containerRef}
        aria-hidden="true"
      />
    );
  }
);
