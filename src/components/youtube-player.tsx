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
    const initialVideoIdRef = useRef<string>(initialVideoId);
    
    // Naya ref jo API ko double-load hone se rokega
    const isInitializingRef = useRef<boolean>(false);

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
      load: (videoId: string, autoplay: boolean = true) => {
        if (!videoId) return;

        if (isPlayerReadyRef.current && playerRef.current) {
          try {
            const request = { videoId, suggestedQuality: "hd1080" as const };

            if (autoplay) {
              // YouTube API automatically plays when loadVideoById is called
              // Double call hatayi hai taaki browser block na kare
              playerRef.current.loadVideoById(request);
            } else {
              playerRef.current.cueVideoById(request);
            }
          } catch (err) {
            console.error("Playback blocked by browser:", err);
            callbacksRef.current.onPlayingChange?.(false);
          }
        } else {
          pendingRef.current = { videoId, autoplay };
        }
      },
      play: (): Promise<void> => {
        if (!isPlayerReadyRef.current || !playerRef.current?.playVideo) {
          return Promise.resolve();
        }
        try {
          playerRef.current.playVideo();
          return Promise.resolve();
        } catch (err) {
          return Promise.reject(err);
        }
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

      if (playerRef.current || isInitializingRef.current) return;
      isInitializingRef.current = true; 

      loadYouTubeIframeApi().then(() => {
        if (!isMounted || !containerRef.current || !window.YT || !window.YT.Player) {
          return;
        }

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
                  if (autoplay) {
                    playerRef.current.loadVideoById(request);
                  } else {
                    playerRef.current.cueVideoById(request);
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

      pollIntervalRef.current = setInterval(() => {
        if (isPlayerReadyRef.current && playerRef.current) {
          try {
            const currentTime = playerRef.current.getCurrentTime?.() || 0;
            const duration = playerRef.current.getDuration?.() || 0;
            callbacksRef.current.onTimeChange?.(currentTime, duration);
          } catch {
          }
        }
      }, 500);

      return () => {
        isMounted = false;
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        if (playerRef.current?.destroy) {
          try {
            playerRef.current.destroy();
          } catch {}
        }
        isPlayerReadyRef.current = false;
        playerRef.current = null;
      };
    }, []);

    return (
      <div
        className="youtube-engine"
        ref={containerRef}
        aria-hidden="true"
        // Ek zaroori cheez: Iframe CSS mein display: none nahi hona chahiye!
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
      />
    );
  }
);
