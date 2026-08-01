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

  // 1. Return immediately if YT.Player is already ready
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  // 2. Return shared in-flight promise if cached
  if (window.__echoYTReady) {
    return window.__echoYTReady;
  }

  // 3. Create script tag and chain onYouTubeIframeAPIReady
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

    // Polling fallback in case callback already fired
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
    const isPlayerReadyRef = useRef<boolean>(false);
    const pendingRef = useRef<{ videoId: string; autoplay: boolean } | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // Captured once so the construction effect never re-runs on track change.
    const initialVideoIdRef = useRef<string>(initialVideoId);
    // Buffering nudge interval (never used to bypass gesture requirements).
    const playRetryRef = useRef<NodeJS.Timeout | null>(null);

    // Keep latest callbacks in ref without triggering reconstruction effect
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

    useImperativeHandle(ref, () => ({
      /**
       * MUST be called synchronously inside a user gesture (onClick).
       * Swaps the source and starts playback immediately — no timers, no awaits.
       * Mirrors the strict HTML5 `audio.src = url; audio.play()` contract.
       */
      load: (videoId: string, autoplay: boolean = true) => {
        if (!videoId) return;

        if (isPlayerReadyRef.current && playerRef.current) {
          try {
            const request = { videoId, suggestedQuality: "hd1080" as const };

            if (autoplay) {
              // 1) Swap source  2) play() — both synchronous, same gesture tick.
              playerRef.current.loadVideoById?.(request);
              const playPromise = playerRef.current.playVideo?.();

              // YT returns undefined, but if a Promise-like is returned (or the
              // underlying <video> promise leaks through) handle it strictly.
              if (playPromise !== undefined && typeof playPromise?.then === "function") {
                playPromise
                  .then(() => {
                    callbacksRef.current.onPlayingChange?.(true);
                  })
                  .catch((error: unknown) => {
                    console.error("Playback blocked by browser strict policy:", error);
                    callbacksRef.current.onPlayingChange?.(false);
                  });
              }

              // Buffering safety net: the gesture has already been consumed
              // above, so this only nudges a source that is still spinning up.
              if (playRetryRef.current) clearInterval(playRetryRef.current);
              const retryStart = Date.now();
              playRetryRef.current = setInterval(() => {
                const state = playerRef.current?.getPlayerState?.();
                // 1 = PLAYING, 3 = BUFFERING (both fine, stop nudging)
                if (state === 1 || Date.now() - retryStart > 4000) {
                  if (playRetryRef.current) clearInterval(playRetryRef.current);
                  playRetryRef.current = null;
                  if (state !== 1 && Date.now() - retryStart > 4000) {
                    callbacksRef.current.onPlayingChange?.(false);
                  }
                  return;
                }
                if (state === 5 || state === 2 || state === -1) {
                  try {
                    playerRef.current?.playVideo?.();
                  } catch {}
                }
              }, 250);
            } else {
              playerRef.current.cueVideoById?.(request);
            }
          } catch (err) {
            console.error("Playback blocked by browser strict policy:", err);
            callbacksRef.current.onPlayingChange?.(false);
          }
        } else {
          // Player not constructed yet — queue it and replay inside onReady.
          pendingRef.current = { videoId, autoplay };
        }
      },
      play: (): Promise<void> => {
        if (!isPlayerReadyRef.current || !playerRef.current?.playVideo) {
          return Promise.reject(new Error("Player not ready"));
        }

        // Fire synchronously inside the caller's gesture tick.
        try {
          playerRef.current.playVideo();
        } catch (err) {
          return Promise.reject(err);
        }

        // Resolve when the player genuinely reaches PLAYING (state 1),
        // reject if it never starts (blocked by autoplay policy).
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
        if (isPlayerReadyRef.current && playerRef.current?.pauseVideo) {
          try {
            playerRef.current.pauseVideo();
          } catch (err) {
            console.error("Player pauseVideo error:", err);
          }
        }
      },
      seek: (seconds: number) => {
        if (isPlayerReadyRef.current && playerRef.current?.seekTo) {
          try {
            playerRef.current.seekTo(seconds, true);
          } catch (err) {
            console.error("Player seekTo error:", err);
          }
        }
      },
      setVolume: (volume: number) => {
        if (isPlayerReadyRef.current && playerRef.current?.setVolume) {
          try {
            playerRef.current.setVolume(Math.max(0, Math.min(100, volume)));
          } catch (err) {
            console.error("Player setVolume error:", err);
          }
        }
      },
    }));

    useEffect(() => {
      let isMounted = true;

      // Guard: construct the iframe EXACTLY once for the lifetime of the app.
      // Rebuilding it on track change destroys the user-gesture context and is
      // the primary reason mobile browsers refused to autoplay on first tap.
      if (playerRef.current) return;

      loadYouTubeIframeApi().then(() => {
        if (!isMounted || !containerRef.current || !window.YT || !window.YT.Player) {
          return;
        }
        if (playerRef.current) return;

        // Clean any existing element
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
                // Force highest playback quality on ready
                try {
                  playerRef.current?.setPlaybackQuality?.("hd1080");
                } catch {}
                callbacksRef.current.onReady?.();

                // Replay pending playback command if queued before ready
                if (pendingRef.current && playerRef.current) {
                  const { videoId, autoplay } = pendingRef.current;
                  pendingRef.current = null;
                  const request = { videoId, suggestedQuality: "hd1080" as const };
                  if (autoplay) {
                    playerRef.current.loadVideoById?.(request);
                    playerRef.current.playVideo?.();
                  } else {
                    playerRef.current.cueVideoById?.(request);
                  }
                }
              },
              onStateChange: (event: { data: number }) => {
                if (!isMounted) return;
                const state = event.data;
                // 1: PLAYING, 2: PAUSED, 5: CUED, 0: ENDED
                if (state === 1) {
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
                callbacksRef.current.onError?.(event.data);
              },
            },
          });
        } catch (err) {
          console.error("Failed to construct YT.Player:", err);
        }
      });

      // Poll current time and duration every 500ms
      pollIntervalRef.current = setInterval(() => {
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
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        if (playRetryRef.current) {
          clearInterval(playRetryRef.current);
          playRetryRef.current = null;
        }
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
