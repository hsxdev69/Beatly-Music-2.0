"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface YouTubePlayerHandle {
  load: (videoId: string, autoplay?: boolean) => void;
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

interface YouTubePlayerProps {
  initialVideoId?: string;
  // NEW: Metadata for Android Lock-Screen / Notification
  trackMetadata?: {
    title: string;
    artist: string;
    artworkUrl: string;
  };
  onPlayingChange?: (isPlaying: boolean) => void;
  onTimeChange?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (errorCode: number) => void;
  onReady?: () => void;
  // NEW: Handlers for Next/Previous buttons on the notification
  onNext?: () => void;
  onPrevious?: () => void;
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

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer(
    {
      initialVideoId = "BddP6PYo2gs",
      trackMetadata,
      onPlayingChange,
      onTimeChange,
      onEnded,
      onError,
      onReady,
      onNext,
      onPrevious,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const isPlayerReadyRef = useRef<boolean>(false);
    const pendingRef = useRef<{ videoId: string; autoplay: boolean } | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const initialVideoIdRef = useRef<string>(initialVideoId);
    const playRetryRef = useRef<NodeJS.Timeout | null>(null);
    const keepAliveRef = useRef<HTMLAudioElement>(null);

    const callbacksRef = useRef({
      onPlayingChange,
      onTimeChange,
      onEnded,
      onError,
      onReady,
      onNext,
      onPrevious,
    });

    useEffect(() => {
      callbacksRef.current = {
        onPlayingChange,
        onTimeChange,
        onEnded,
        onError,
        onReady,
        onNext,
        onPrevious,
      };
    });

    // --- Media Session Setup (Notification Controls) ---
    useEffect(() => {
      if ('mediaSession' in navigator && trackMetadata) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: trackMetadata.title || 'Unknown Title',
          artist: trackMetadata.artist || 'Unknown Artist',
          album: 'Echo Music', // Or Beatly Music
          artwork: [
            { src: trackMetadata.artworkUrl, sizes: '512x512', type: 'image/jpeg' },
            { src: trackMetadata.artworkUrl, sizes: '192x192', type: 'image/jpeg' }
          ]
        });
      }
    }, [trackMetadata]);

    useEffect(() => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
          playerRef.current?.playVideo?.();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          playerRef.current?.pauseVideo?.();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          callbacksRef.current.onNext?.();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          callbacksRef.current.onPrevious?.();
        });
      }
    }, []);

    // --- Silent Keep-Alive controls ---
    function startKeepAlive() {
      const el = keepAliveRef.current;
      if (!el) return;
      try {
        el.volume = 0;
        el.muted = false; 
        const p = el.play();
        if (p && typeof (p as Promise<void>).catch === "function") {
          (p as Promise<void>).catch(() => {});
        }
      } catch {}
    }

    function stopKeepAlive() {
      const el = keepAliveRef.current;
      if (!el) return;
      try {
        el.pause();
      } catch {}
    }

    useImperativeHandle(ref, () => ({
      load: (videoId: string, autoplay: boolean = true) => {
        if (!videoId) return;

        if (isPlayerReadyRef.current && playerRef.current) {
          try {
            const request = { videoId, suggestedQuality: "hd1080" as const };

            if (autoplay) {
              playerRef.current.loadVideoById?.(request);
              const playPromise = playerRef.current.playVideo?.();

              if (playPromise !== undefined && typeof playPromise?.then === "function") {
                playPromise
                  .then(() => callbacksRef.current.onPlayingChange?.(true))
                  .catch(() => callbacksRef.current.onPlayingChange?.(false));
              }

              if (playRetryRef.current) clearInterval(playRetryRef.current);
              const retryStart = Date.now();
              playRetryRef.current = setInterval(() => {
                const state = playerRef.current?.getPlayerState?.();
                if (state === 1 || Date.now() - retryStart > 4000) {
                  if (playRetryRef.current) clearInterval(playRetryRef.current);
                  playRetryRef.current = null;
                  if (state !== 1 && Date.now() - retryStart > 4000) {
                    callbacksRef.current.onPlayingChange?.(false);
                  }
                  return;
                }
                if (state === 5 || state === 2 || state === -1) {
                  try { playerRef.current?.playVideo?.(); } catch {}
                }
              }, 250);
            } else {
              playerRef.current.cueVideoById?.(request);
            }
          } catch (err) {
            callbacksRef.current.onPlayingChange?.(false);
          }
        } else {
          pendingRef.current = { videoId, autoplay };
        }
      },
      play: (): Promise<void> => {
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
        if (isPlayerReadyRef.current && playerRef.current?.pauseVideo) {
          try { playerRef.current.pauseVideo(); } catch {}
        }
      },
      seek: (seconds: number) => {
        if (isPlayerReadyRef.current && playerRef.current?.seekTo) {
          try { playerRef.current.seekTo(seconds, true); } catch {}
        }
      },
      setVolume: (volume: number) => {
        if (isPlayerReadyRef.current && playerRef.current?.setVolume) {
          try { playerRef.current.setVolume(Math.max(0, Math.min(100, volume))); } catch {}
        }
      },
    }));

    useEffect(() => {
      let isMounted = true;
      if (playerRef.current) return;

      loadYouTubeIframeApi().then(() => {
        if (!isMounted || !containerRef.current || !window.YT || !window.YT.Player) return;
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
              controls: 0, disablekb: 1, fs: 0, playsinline: 1, rel: 0,
              origin: typeof window !== "undefined" ? window.location.origin : undefined,
            },
            events: {
              onReady: () => {
                if (!isMounted) return;
                isPlayerReadyRef.current = true;
                try { playerRef.current?.setPlaybackQuality?.("hd1080"); } catch {}
                callbacksRef.current.onReady?.();

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
                if (state === 1) {
                  startKeepAlive();
                  callbacksRef.current.onPlayingChange?.(true);
                  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                } else if (state === 2 || state === 5) {
                  stopKeepAlive();
                  callbacksRef.current.onPlayingChange?.(false);
                  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
                } else if (state === 0) {
                  stopKeepAlive();
                  callbacksRef.current.onPlayingChange?.(false);
                  callbacksRef.current.onEnded?.();
                }
              },
              onError: (event: { data: number }) => {
                if (!isMounted) return;
                callbacksRef.current.onError?.(event.data);
              },
            },
          });
        } catch (err) {}
      });

      pollIntervalRef.current = setInterval(() => {
        if (isPlayerReadyRef.current && playerRef.current) {
          try {
            const currentTime = playerRef.current.getCurrentTime?.() || 0;
            const duration = playerRef.current.getDuration?.() || 0;
            callbacksRef.current.onTimeChange?.(currentTime, duration);
          } catch {}
        }
      }, 500);

      return () => {
        isMounted = false;
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (playRetryRef.current) { clearInterval(playRetryRef.current); playRetryRef.current = null; }
        try { keepAliveRef.current?.pause(); } catch {}
        if (playerRef.current?.destroy) { try { playerRef.current.destroy(); } catch {} }
        isPlayerReadyRef.current = false;
        playerRef.current = null;
      };
    }, []);

    return (
      <>
        <div className="youtube-engine" ref={containerRef} aria-hidden="true" />
        <audio
          ref={keepAliveRef}
          id="keep-alive-audio"
          src="data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIAD+//7+////////////////////////////////////////////////////////AAAAAExhdmYAAAAAAAAAAAAAAAAAAAAAAAD/84QAAAAAAAAAAAAAAAAAAAAAAA=="
          loop
          preload="auto"
          aria-hidden="true"
          style={{ display: "none" }}
        />
      </>
    );
  }
);
