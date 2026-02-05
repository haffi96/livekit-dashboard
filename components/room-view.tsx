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
import { TelemetryPanel } from "./telemetry-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wifi, WifiOff, Activity, ChevronRight, ChevronLeft, Maximize2, Minimize2, Square } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCredentials } from "@/lib/credentials/context";

interface RoomViewProps {
  roomName: string;
}

function RoomContent({ roomName }: { roomName: string }) {
  const connectionState = useConnectionState();
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [tileSize, setTileSize] = useState<TileSize>("medium");

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

  const tileSizeOptions: { value: TileSize; label: string; icon: React.ReactNode }[] = [
    { value: "small", label: "Small", icon: <Minimize2 className="h-4 w-4" /> },
    { value: "medium", label: "Medium", icon: <Square className="h-4 w-4" /> },
    { value: "large", label: "Large", icon: <Maximize2 className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">{roomName}</h1>
              {getConnectionBadge()}
            </div>
            <div className="flex items-center gap-2">
              {/* Tile Size Controls */}
              <div className="flex items-center gap-1 border border-neutral-800 rounded-md p-1">
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
              {/* Telemetry Toggle */}
              <Button
                variant={showTelemetry ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowTelemetry(!showTelemetry)}
                className="gap-2"
              >
                <Activity className="h-4 w-4" />
                Telemetry
                {showTelemetry ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className={cn(
          "grid gap-8 transition-all duration-300",
          showTelemetry ? "lg:grid-cols-3" : "lg:grid-cols-1"
        )}>
          {/* Video Grid */}
          <div className={cn(showTelemetry ? "lg:col-span-2" : "lg:col-span-1")}>
            <h2 className="text-lg font-semibold mb-4">Camera Feeds</h2>
            <VideoGrid tileSize={tileSize} />
          </div>

          {/* Telemetry Panel */}
          {showTelemetry && (
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-4">Telemetry Data</h2>
              <TelemetryPanel />
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
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // No credentials - redirect to home
  if (!credentials) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="h-12 w-12 mx-auto mb-4 text-neutral-500" />
          <h2 className="text-xl font-semibold mb-2">Not Connected</h2>
          <p className="text-neutral-400 mb-4">
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-neutral-400">Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-neutral-400 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
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
