"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ConnectionStateToast,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { VideoGrid, type TileSize } from "./video-grid";
import { DataPanel } from "./data-panel";
import { RecordingControls } from "./recording-controls";
import { HlsPlayer } from "./hls-player";
import { DvrTimeline } from "./dvr-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  Activity,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Square,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCredentials } from "@/lib/credentials/context";

interface RoomViewProps {
  roomName: string;
}

type PlaybackMode = "webrtc_live" | "hls_live_window" | "hls_extended";

function RoomContent({ roomName }: { roomName: string }) {
  const connectionState = useConnectionState();
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [tileSize, setTileSize] = useState<TileSize>("medium");

  // DVR state
  const [isRecording, setIsRecording] = useState(false);
  const [hlsPrefix, setHlsPrefix] = useState<string | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("webrtc_live");
  const [isAtLiveEdge, setIsAtLiveEdge] = useState(true);
  const [hlsCurrentTime, setHlsCurrentTime] = useState(0);
  const [hlsDuration, setHlsDuration] = useState(0);
  const [liveWindowDuration, setLiveWindowDuration] = useState(0);
  const [pendingBehindLive, setPendingBehindLive] = useState<number | null>(
    null,
  );
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const isHlsMode = playbackMode !== "webrtc_live";

  const hlsLiveSrc = hlsPrefix
    ? `/api/egress/gcs?path=${encodeURIComponent(hlsPrefix + "/live.m3u8")}`
    : null;
  const hlsPlaylistSrc = hlsPrefix
    ? `/api/egress/gcs?path=${encodeURIComponent(hlsPrefix + "/playlist.m3u8")}`
    : null;
  const activeHlsSrc =
    playbackMode === "hls_extended" ? hlsPlaylistSrc : hlsLiveSrc;

  const pollForPlaylist = useCallback(async () => {
    const prefix = `recordings/${roomName}/`;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(
          `/api/egress/gcs/list?prefix=${encodeURIComponent(prefix)}`,
        );
        const data = await res.json();
        const livePlaylists = (data.playlists as string[])?.filter(
          (p: string) => p.endsWith("live.m3u8"),
        );
        if (livePlaylists && livePlaylists.length > 0) {
          const latest = livePlaylists[livePlaylists.length - 1];
          const dir = latest.replace("/live.m3u8", "");
          setHlsPrefix(dir);
          clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, 3000);
  }, [roomName]);

  const handleRecordingStarted = useCallback(() => {
    setIsRecording(true);
    pollForPlaylist();
  }, [pollForPlaylist]);

  const handleRecordingStopped = useCallback(() => {
    setIsRecording(false);
    setPlaybackMode("webrtc_live");
    setHlsPrefix(null);
    setSeekTarget(null);
    setPendingBehindLive(null);
    setLiveWindowDuration(0);
    setHlsCurrentTime(0);
    setHlsDuration(0);
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (playbackMode === "webrtc_live") {
      setPlaybackMode("hls_live_window");
      setSeekTarget(time);
      setPendingBehindLive(null);
      setIsAtLiveEdge(false);
      return;
    }

    if (playbackMode === "hls_live_window") {
      const atOldestPoint = time <= Math.max(1, liveWindowDuration * 0.02);
      if (atOldestPoint && hlsPlaylistSrc) {
        const requestedBehindLive = Math.max(0, liveWindowDuration - time);
        setPendingBehindLive(requestedBehindLive);
        setPlaybackMode("hls_extended");
        setSeekTarget(null);
        setIsAtLiveEdge(false);
        return;
      }
    }

    setSeekTarget(time);
    setIsAtLiveEdge(false);
  }, [playbackMode, liveWindowDuration, hlsPlaylistSrc]);

  const handleGoLive = useCallback(() => {
    setPlaybackMode("webrtc_live");
    setIsAtLiveEdge(true);
    setHlsCurrentTime((prev) => (hlsDuration > 0 ? hlsDuration : prev));
    setSeekTarget(null);
    setPendingBehindLive(null);
  }, [hlsDuration]);

  const handleHlsTimeUpdate = useCallback((time: number, duration: number) => {
    setHlsCurrentTime(time);
    setHlsDuration(duration);
    if (playbackMode === "hls_live_window") {
      setLiveWindowDuration(duration);
    }
    if (playbackMode === "hls_extended" && pendingBehindLive !== null) {
      setSeekTarget(Math.max(0, duration - pendingBehindLive));
      setPendingBehindLive(null);
    }
  }, [playbackMode, pendingBehindLive]);

  const handleHlsLiveEdge = useCallback((live: boolean) => {
    setIsAtLiveEdge((prev) => (prev === live ? prev : live));
  }, []);

  const getConnectionBadge = () => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            Connected
          </Badge>
        );
      case ConnectionState.Connecting:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Wifi className="h-3 w-3 animate-pulse" />
            Connecting...
          </Badge>
        );
      case ConnectionState.Reconnecting:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Wifi className="h-3 w-3 animate-pulse" />
            Reconnecting...
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Disconnected
          </Badge>
        );
    }
  };

  const tileSizeOptions: {
    value: TileSize;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "small", label: "Small", icon: <Minimize2 className="h-4 w-4" /> },
    { value: "medium", label: "Medium", icon: <Square className="h-4 w-4" /> },
    { value: "large", label: "Large", icon: <Maximize2 className="h-4 w-4" /> },
  ];

  const rewindSizeClasses: Record<TileSize, string> = {
    small: "w-full sm:w-1/3 md:w-1/4 lg:w-1/5",
    medium: "w-full sm:w-1/2 lg:w-1/3",
    large: "w-full lg:w-1/2",
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">{roomName}</h1>
              {getConnectionBadge()}
            </div>
            <div className="flex items-center gap-2">
              {/* Recording Controls */}
              <RecordingControls
                roomName={roomName}
                onRecordingStarted={handleRecordingStarted}
                onRecordingStopped={handleRecordingStopped}
              />
              {/* Tile Size Controls */}
              <div className="flex items-center gap-1 rounded-md border border-neutral-800 p-1">
                {tileSizeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={tileSize === option.value ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTileSize(option.value)}
                    title={option.label}
                    className="h-8 w-8 p-0"
                  >
                    {option.icon}
                  </Button>
                ))}
              </div>
              {/* Data Panel Toggle */}
              <Button
                variant={showDataPanel ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowDataPanel(!showDataPanel)}
                className="gap-2"
              >
                <Activity className="h-4 w-4" />
                Data
                {showDataPanel ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div
          className={cn(
            "grid gap-8",
            showDataPanel ? "lg:grid-cols-3" : "lg:grid-cols-1",
          )}
        >
          {/* Video Grid / HLS Rewind */}
          <div
            className={cn(showDataPanel ? "lg:col-span-2" : "lg:col-span-1")}
          >
            <h2 className="mb-4 text-lg font-semibold">Camera Feeds</h2>

            {/* Show HLS rewind player when scrubbing back */}
            {isHlsMode && activeHlsSrc ? (
              <div
                className={cn(
                  "relative",
                  rewindSizeClasses[tileSize],
                )}
              >
                <div className="mb-2">
                  <Badge
                    variant="secondary"
                    className="h-5 px-2 text-[10px] tracking-wide uppercase"
                  >
                    {playbackMode === "hls_extended"
                      ? "Rewind (Extended)"
                      : "Rewind"}
                  </Badge>
                </div>
                <HlsPlayer
                  src={activeHlsSrc}
                  seekTo={seekTarget}
                  onTimeUpdate={handleHlsTimeUpdate}
                  onLiveEdge={handleHlsLiveEdge}
                  className="aspect-video w-full rounded-lg bg-black"
                />
              </div>
            ) : (
              <VideoGrid tileSize={tileSize} />
            )}

            {/* DVR Timeline */}
            {isRecording && hlsPrefix && (
              <div className="mt-4">
                <DvrTimeline
                  currentTime={hlsCurrentTime}
                  duration={hlsDuration}
                  isAtLiveEdge={isAtLiveEdge}
                  isRecording={isRecording}
                  onSeek={handleSeek}
                  onGoLive={handleGoLive}
                />
              </div>
            )}
          </div>

          {/* Data Panel */}
          {showDataPanel && (
            <div className="lg:col-span-1">
              <h2 className="mb-4 text-lg font-semibold">Data Panel</h2>
              <DataPanel />
            </div>
          )}
        </div>

        {/* Audio Renderer (hidden, for any audio tracks) */}
        <RoomAudioRenderer />
        <ConnectionStateToast />
      </div>
    </div>
  );
}

export function RoomView({ roomName }: RoomViewProps) {
  const { credentials, isLoading: isLoadingCredentials } = useCredentials();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchToken = useCallback(async () => {
    if (!credentials) return;

    try {
      setIsLoading(true);
      setError(null);

      // Generate a unique participant name for this viewer
      const participantName = `viewer-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          participantName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get access token");
      }

      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [roomName, credentials]);

  useEffect(() => {
    if (credentials) {
      fetchToken();
    }
  }, [credentials, fetchToken]);

  // Loading credentials
  if (isLoadingCredentials) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  // No credentials - redirect to home
  if (!credentials) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <WifiOff className="mx-auto mb-4 h-12 w-12 text-neutral-500" />
          <h2 className="mb-2 text-xl font-semibold">Not Connected</h2>
          <p className="mb-4 text-neutral-400">
            Please configure your LiveKit credentials first.
          </p>
          <Link href="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="text-neutral-400">Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <WifiOff className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold">Connection Error</h2>
          <p className="mb-4 text-neutral-400">{error}</p>
          <div className="flex justify-center gap-4">
            <Link href="/">
              <Button variant="outline">Back to Rooms</Button>
            </Link>
            <Button onClick={fetchToken}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <LiveKitRoom
      serverUrl={credentials.url}
      token={token}
      connect={true}
      audio={false}
      video={false}
    >
      <RoomContent roomName={roomName} />
    </LiveKitRoom>
  );
}
