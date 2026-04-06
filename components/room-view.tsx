"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ConnectionStateToast,
  useConnectionState,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { VideoGrid, type TileSize } from "./video-grid";
import { DataPanel } from "./data-panel";
import { RecordingControls } from "./recording-controls";
import { ReplayGrid } from "./replay-grid";
import { DvrTimeline } from "./dvr-timeline";
import { RecordingHistoryTimeline } from "./recording-history-timeline";
import { ParticipantRoster } from "./participant-roster";
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
import type {
  RecordingSession,
  RecordingTrackInput,
} from "@/lib/recording-session";

interface RoomViewProps {
  roomName: string;
}

type PlaybackMode = "webrtc_live" | "hls_live_window" | "hls_extended";

async function fetchRecordingSessionsForRoom(roomName: string) {
  const response = await fetch(
    `/api/egress/sessions?roomName=${encodeURIComponent(roomName)}`,
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load recording sessions");
  }

  return (data.sessions as RecordingSession[]) ?? [];
}

function RoomContent({ roomName }: { roomName: string }) {
  const connectionState = useConnectionState();
  const liveCameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: true,
  }).filter((trackRef) => trackRef.publication?.track !== undefined);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [tileSize, setTileSize] = useState<TileSize>("medium");
  const [historyNow, setHistoryNow] = useState<number>(() => Date.now());
  const [historyWindowHours, setHistoryWindowHours] = useState(12);

  // DVR state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSession, setRecordingSession] =
    useState<RecordingSession | null>(null);
  const [recordingSessions, setRecordingSessions] = useState<
    RecordingSession[]
  >([]);
  const [readyPlaybackKey, setReadyPlaybackKey] = useState<string | null>(null);
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
  const replayTracks = recordingSession?.tracks ?? [];
  const useExtendedPlaylist = playbackMode === "hls_extended" || !isRecording;
  const playbackKey = recordingSession
    ? `${recordingSession.sessionId}:${useExtendedPlaylist ? "extended" : "live"}`
    : null;
  const recordingReady =
    playbackKey !== null && readyPlaybackKey === playbackKey;
  const canReplay = replayTracks.length > 0 && recordingReady;
  const activeRecordingSessionId =
    [...recordingSessions]
      .reverse()
      .find((session) => session.endedAt === undefined)?.sessionId ?? null;
  const recordableTracks: RecordingTrackInput[] = liveCameraTracks.map(
    (trackRef) => ({
      trackSid: trackRef.publication.trackSid,
      participantIdentity: trackRef.participant.identity,
      participantName:
        trackRef.participant.name || trackRef.participant.identity,
      trackName: trackRef.publication.trackName,
      source: "camera",
    }),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHistoryNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchRecordingSessionsForRoom(roomName)
      .then((sessions) => {
        if (!cancelled) {
          setRecordingSessions(sessions);
        }
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, [roomName]);

  useEffect(() => {
    if (!recordingSession) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const nextPlaybackKey = `${recordingSession.sessionId}:${useExtendedPlaylist ? "extended" : "live"}`;

    const pollForPlaylists = async () => {
      while (!cancelled && attempts < 30) {
        attempts += 1;
        try {
          const response = await fetch(
            `/api/egress/gcs/list?prefix=${encodeURIComponent(`${recordingSession.prefix}/`)}`,
          );
          const data = await response.json();
          const playlists = (data.playlists as string[]) ?? [];
          const relevantPlaylists = playlists.filter((path) =>
            path.endsWith(
              useExtendedPlaylist ? "/playlist.m3u8" : "/live.m3u8",
            ),
          );

          if (relevantPlaylists.length >= recordingSession.tracks.length) {
            if (!cancelled) {
              setReadyPlaybackKey(nextPlaybackKey);
            }
            return;
          }
        } catch {
          // keep polling while egress spins up
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    };

    void pollForPlaylists();

    return () => {
      cancelled = true;
    };
  }, [recordingSession, useExtendedPlaylist]);

  function handleRecordingStateChange(state: {
    session: RecordingSession | null;
    isRecording: boolean;
  }) {
    setIsRecording(state.isRecording);
    if (state.session) {
      const session = state.session;
      setRecordingSession(state.session);
      setRecordingSessions((previousSessions) => {
        const nextSessions = previousSessions.filter(
          (existingSession) => existingSession.sessionId !== session.sessionId,
        );
        nextSessions.push(session);
        return nextSessions.toSorted((a, b) => a.startedAt - b.startedAt);
      });
    }
    if (!state.isRecording && playbackMode === "hls_live_window") {
      setPlaybackMode("hls_extended");
    }
    void fetchRecordingSessionsForRoom(roomName)
      .then((sessions) => setRecordingSessions(sessions))
      .catch(() => {
        // ignore
      });
  }

  function handleSeek(time: number) {
    if (!recordingSession) return;

    if (playbackMode === "webrtc_live") {
      setPlaybackMode(isRecording ? "hls_live_window" : "hls_extended");
      setSeekTarget(time);
      setPendingBehindLive(null);
      setIsAtLiveEdge(false);
      return;
    }

    if (playbackMode === "hls_live_window" && isRecording) {
      const atOldestPoint = time <= Math.max(1, liveWindowDuration * 0.02);
      if (atOldestPoint) {
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
  }

  function handleGoLive() {
    setPlaybackMode("webrtc_live");
    setIsAtLiveEdge(true);
    setHlsCurrentTime((prev) => (hlsDuration > 0 ? hlsDuration : prev));
    setSeekTarget(null);
    setPendingBehindLive(null);
  }

  function handleHlsTimeUpdate(time: number, duration: number) {
    setHlsCurrentTime(time);
    setHlsDuration(duration);
    if (playbackMode === "hls_live_window") {
      setLiveWindowDuration(duration);
    }
    if (playbackMode === "hls_extended" && pendingBehindLive !== null) {
      setSeekTarget(Math.max(0, duration - pendingBehindLive));
      setPendingBehindLive(null);
    }
  }

  function handleHlsLiveEdge(live: boolean) {
    setIsAtLiveEdge((prev) => (prev === live ? prev : live));
  }

  function handleHistorySelect(secondsBehindLive: number) {
    const clickedTimestamp = historyNow - secondsBehindLive * 1000;
    const selectedSession = [...recordingSessions].reverse().find((session) => {
      const sessionEnd = session.endedAt ?? historyNow;
      return (
        clickedTimestamp >= session.startedAt && clickedTimestamp <= sessionEnd
      );
    });

    if (!selectedSession) return;

    setRecordingSession(selectedSession);
    setIsAtLiveEdge(false);
    setHlsCurrentTime(0);
    setHlsDuration(0);

    const shouldUseLiveWindow =
      selectedSession.endedAt === undefined &&
      selectedSession.sessionId === activeRecordingSessionId &&
      liveWindowDuration > 0 &&
      secondsBehindLive <= liveWindowDuration;

    if (shouldUseLiveWindow) {
      setPlaybackMode("hls_live_window");
      setPendingBehindLive(null);
      setSeekTarget(Math.max(0, liveWindowDuration - secondsBehindLive));
      return;
    }

    setPlaybackMode("hls_extended");
    setSeekTarget(null);
    setPendingBehindLive(secondsBehindLive);
  }

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
                tracks={recordableTracks}
                onRecordingStateChange={handleRecordingStateChange}
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
            <ParticipantRoster isReplayMode={isHlsMode} />
            <h2 className="mb-4 text-lg font-semibold">Camera Feeds</h2>

            {isHlsMode && canReplay ? (
              <ReplayGrid
                tracks={replayTracks}
                tileSize={tileSize}
                useExtendedPlaylist={useExtendedPlaylist}
                seekTo={seekTarget}
                onTimeUpdate={handleHlsTimeUpdate}
                onLiveEdge={handleHlsLiveEdge}
              />
            ) : (
              <VideoGrid tileSize={tileSize} trackRefs={liveCameraTracks} />
            )}

            {(recordingSessions.length > 0 ||
              (recordingSession && recordingReady)) && (
              <div className="mt-4 space-y-3">
                {/* DVR Timeline */}
                {recordingSession && recordingReady ? (
                  <DvrTimeline
                    currentTime={hlsCurrentTime}
                    duration={hlsDuration}
                    isAtLiveEdge={isAtLiveEdge}
                    isRecording={true}
                    onSeek={handleSeek}
                    onGoLive={handleGoLive}
                  />
                ) : null}
                <RecordingHistoryTimeline
                  sessions={recordingSessions}
                  activeSessionId={activeRecordingSessionId}
                  windowHours={historyWindowHours}
                  nowTimestamp={historyNow}
                  onSelectTimestamp={handleHistorySelect}
                  onWindowHoursChange={setHistoryWindowHours}
                />
              </div>
            )}
          </div>

          {/* Data Panel */}
          <div className={cn("lg:col-span-1", !showDataPanel && "hidden")}>
            <h2 className="mb-4 text-lg font-semibold">Data Panel</h2>
            <DataPanel />
          </div>
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
  }, [credentials, roomName]);

  useEffect(() => {
    if (credentials) {
      void fetchToken();
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
