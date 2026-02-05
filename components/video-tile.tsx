"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { TrackReference } from "@livekit/components-react";
import { VideoTrack } from "@livekit/components-react";
import { RemoteVideoTrack } from "livekit-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoTileProps {
  trackRef: TrackReference;
  showStats: boolean;
  onToggleStats: () => void;
}

interface VideoStats {
  resolution: string;
  framerate: number | null;
  bitrate: number; // in kbps
  codec: string;
  jitter: number | null; // in ms
  packetLoss: number | null; // percentage
  rtt: number | null; // in ms
  packetsReceived: number;
  packetsLost: number;
}

const defaultStats: VideoStats = {
  resolution: "-",
  framerate: null,
  bitrate: 0,
  codec: "-",
  jitter: null,
  packetLoss: null,
  rtt: null,
  packetsReceived: 0,
  packetsLost: 0,
};

export function VideoTile({ trackRef, showStats, onToggleStats }: VideoTileProps) {
  const participantName = trackRef.participant.name || trackRef.participant.identity;
  const [stats, setStats] = useState<VideoStats>(defaultStats);

  // Track previous bytes for bitrate calculation
  const prevBytesRef = useRef<{ bytes: number; timestamp: number } | null>(null);

  const fetchStats = useCallback(async () => {
    const track = trackRef.publication?.track;
    if (!track || !(track instanceof RemoteVideoTrack)) return;

    try {
      const report = await track.getRTCStatsReport();
      if (!report) return;

      const newStats: Partial<VideoStats> = {};
      let codecId: string | null = null;

      report.forEach((value) => {
        // Get inbound-rtp stats for video
        if (value.type === "inbound-rtp" && value.kind === "video") {
          const frameWidth = value.frameWidth as number | undefined;
          const frameHeight = value.frameHeight as number | undefined;

          if (frameWidth && frameHeight) {
            newStats.resolution = `${frameWidth}x${frameHeight}`;
          }

          const fps = value.framesPerSecond as number | undefined;
          if (fps !== undefined) {
            newStats.framerate = Math.round(fps);
          }

          const jitter = value.jitter as number | undefined;
          if (jitter !== undefined) {
            newStats.jitter = Math.round(jitter * 1000); // Convert to ms
          }

          const packetsLost = (value.packetsLost as number) || 0;
          const packetsReceived = (value.packetsReceived as number) || 0;
          newStats.packetsLost = packetsLost;
          newStats.packetsReceived = packetsReceived;

          if (packetsReceived > 0) {
            newStats.packetLoss = (packetsLost / (packetsReceived + packetsLost)) * 100;
          }

          // Calculate bitrate from bytes received delta
          const bytesReceived = value.bytesReceived as number | undefined;
          const timestamp = value.timestamp as number | undefined;

          if (bytesReceived !== undefined && timestamp !== undefined) {
            if (prevBytesRef.current) {
              const bytesDelta = bytesReceived - prevBytesRef.current.bytes;
              const timeDelta = (timestamp - prevBytesRef.current.timestamp) / 1000; // to seconds
              if (timeDelta > 0) {
                newStats.bitrate = Math.round((bytesDelta * 8) / timeDelta / 1000); // kbps
              }
            }
            prevBytesRef.current = { bytes: bytesReceived, timestamp };
          }

          codecId = value.codecId as string | null;
        }

        // Get candidate-pair stats for RTT
        if (value.type === "candidate-pair" && value.state === "succeeded") {
          const rtt = value.currentRoundTripTime as number | undefined;
          if (rtt !== undefined) {
            newStats.rtt = Math.round(rtt * 1000); // Convert to ms
          }
        }
      });

      // Get codec info
      if (codecId) {
        report.forEach((value) => {
          if (value.type === "codec" && value.id === codecId) {
            const mimeType = value.mimeType as string | undefined;
            if (mimeType) {
              // Extract codec name from mime type (e.g., "video/H264" -> "H264")
              newStats.codec = mimeType.split("/")[1] || mimeType;
            }
          }
        });
      }

      setStats((prev) => ({ ...prev, ...newStats }));
    } catch (error) {
      console.error("Error fetching RTC stats:", error);
    }
  }, [trackRef]);

  // Poll stats when expanded
  useEffect(() => {
    if (!showStats) {
      prevBytesRef.current = null;
      return;
    }

    // Fetch immediately (using setTimeout to avoid sync setState in effect)
    const initialTimeout = setTimeout(fetchStats, 0);

    // Then poll every second
    const interval = setInterval(fetchStats, 1000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [showStats, fetchStats]);

  const formatBitrate = (kbps: number) => {
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${kbps} kbps`;
  };

  return (
    <Card className="overflow-hidden bg-neutral-900 border-neutral-800">
      {/* Video */}
      <div className="relative aspect-video bg-black">
        <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="bg-black/70 backdrop-blur-sm">
            {participantName}
          </Badge>
        </div>
      </div>

      {/* Stats Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleStats}
        className="w-full rounded-none border-t border-neutral-800 hover:bg-neutral-800 flex items-center justify-between px-3 py-2 h-auto"
      >
        <span className="flex items-center gap-2 text-xs text-neutral-400">
          <BarChart3 className="h-3 w-3" />
          Stats
        </span>
        {showStats ? (
          <ChevronUp className="h-4 w-4 text-neutral-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        )}
      </Button>

      {/* Stats Panel */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          showStats ? "max-h-64" : "max-h-0"
        )}
      >
        <div className="p-3 border-t border-neutral-800 bg-neutral-950 space-y-2 text-xs font-mono">
          <StatRow label="Resolution" value={stats.resolution} />
          <StatRow
            label="Framerate"
            value={stats.framerate !== null ? `${stats.framerate} fps` : "-"}
          />
          <StatRow label="Bitrate" value={formatBitrate(stats.bitrate)} />
          <StatRow label="Codec" value={stats.codec} />
          <StatRow
            label="Jitter"
            value={stats.jitter !== null ? `${stats.jitter} ms` : "-"}
          />
          <StatRow
            label="Packet Loss"
            value={
              stats.packetLoss !== null
                ? `${stats.packetLoss.toFixed(2)}%`
                : "-"
            }
            highlight={stats.packetLoss !== null && stats.packetLoss > 1}
          />
          <StatRow
            label="RTT"
            value={stats.rtt !== null ? `${stats.rtt} ms` : "-"}
            highlight={stats.rtt !== null && stats.rtt > 100}
          />
        </div>
      </div>
    </Card>
  );
}

function StatRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className={cn("text-neutral-200", highlight && "text-yellow-500")}>
        {value}
      </span>
    </div>
  );
}
