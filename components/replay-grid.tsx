"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HlsPlayer } from "@/components/hls-player";
import { getVideoGridClasses, type TileSize } from "@/components/video-grid";
import { cn } from "@/lib/utils";
import type { RecordingTrack } from "@/lib/recording-session";

interface ReplayGridProps {
  tracks: RecordingTrack[];
  tileSize?: TileSize;
  useExtendedPlaylist: boolean;
  seekTo?: number | null;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLiveEdge?: (isLive: boolean) => void;
}

function toProxyUrl(path: string) {
  return `/api/egress/gcs?path=${encodeURIComponent(path)}`;
}

export function ReplayGrid({
  tracks,
  tileSize = "medium",
  useExtendedPlaylist,
  seekTo,
  onTimeUpdate,
  onLiveEdge,
}: ReplayGridProps) {
  return (
    <div className={cn("grid gap-4", getVideoGridClasses(tileSize))}>
      {tracks.map((track, index) => {
        const src = toProxyUrl(
          useExtendedPlaylist ? track.playlistPath : track.livePlaylistPath,
        );
        const participantLabel =
          track.participantName || track.participantIdentity;

        return (
          <Card
            key={track.trackSid}
            className="overflow-hidden border-neutral-800 bg-neutral-900"
          >
            <div className="relative aspect-video bg-black">
              <HlsPlayer
                src={src}
                seekTo={seekTo}
                onTimeUpdate={index === 0 ? onTimeUpdate : undefined}
                onLiveEdge={index === 0 ? onLiveEdge : undefined}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-2 left-2 flex gap-2">
                <Badge variant="secondary" className="bg-black/70 backdrop-blur-sm">
                  {participantLabel}
                </Badge>
                <Badge variant="secondary" className="bg-black/70 text-[10px] uppercase">
                  Replay
                </Badge>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
