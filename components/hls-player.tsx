"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Hls from "hls.js";

interface HlsPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLiveEdge?: (isLive: boolean) => void;
  seekTo?: number | null;
  className?: string;
}

export function HlsPlayer({
  src,
  onTimeUpdate,
  onLiveEdge,
  seekTo,
  className,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkLiveEdge = useCallback(() => {
    const video = videoRef.current;
    if (!video || !onLiveEdge) return;
    const buffered = video.buffered;
    if (buffered.length === 0) return;
    const end = buffered.end(buffered.length - 1);
    const isAtLive = end - video.currentTime < 2;
    onLiveEdge(isAtLive);
  }, [onLiveEdge]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (!Hls.isSupported()) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.play().catch(() => {});
        return;
      }
      return;
    }

    const hls = new Hls({
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      enableWorker: true,
      lowLatencyMode: false,
    });

    hlsRef.current = hls;
    hls.loadSource(src);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            setError(`Playback error: ${data.details}`);
            break;
        }
      }
    });

    const handleTimeUpdate = () => {
      if (onTimeUpdate && video.duration) {
        onTimeUpdate(video.currentTime, video.duration);
      }
      checkLiveEdge();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      hls.destroy();
      hlsRef.current = null;
    };
  }, [src, onTimeUpdate, checkLiveEdge]);

  useEffect(() => {
    if (seekTo !== null && seekTo !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      playsInline
      muted
      controls={false}
    />
  );
}
