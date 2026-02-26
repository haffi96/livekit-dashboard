"use client";

import { useState } from "react";
import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { VideoTile } from "./video-tile";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";

export type TileSize = "small" | "medium" | "large";

interface VideoGridProps {
  tileSize?: TileSize;
}

const gridClasses: Record<TileSize, string> = {
  small: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  medium: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  large: "grid-cols-1 lg:grid-cols-2",
};

export function VideoGrid({ tileSize = "medium" }: VideoGridProps) {
  const [showStats, setShowStats] = useState(false);

  // Get all video tracks from participants
  const tracks = useTracks([Track.Source.Camera], {
    onlySubscribed: true,
  });

  // Filter to only show tracks that are not from the local participant
  // (since local participant doesn't publish, this will show all camera feeds)
  const videoTracks = tracks.filter(
    (trackRef) => trackRef.publication?.track !== undefined,
  );

  if (videoTracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 py-16">
        <Video className="mb-4 h-12 w-12 text-neutral-600" />
        <h3 className="mb-2 text-lg font-medium">No Video Feeds</h3>
        <p className="max-w-md text-center text-neutral-400">
          Waiting for camera feeds from connected devices...
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        gridClasses[tileSize],
      )}
    >
      {videoTracks.map((trackRef) => (
        <VideoTile
          key={trackRef.publication?.trackSid}
          trackRef={trackRef}
          showStats={showStats}
          onToggleStats={() => setShowStats(!showStats)}
        />
      ))}
    </div>
  );
}
