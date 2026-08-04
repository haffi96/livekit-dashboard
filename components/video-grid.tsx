"use client";

import { useState } from "react";
import { useTracks, type TrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import { VideoTile } from "./video-tile";
import { Check, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type TileSize = "small" | "medium" | "large";

interface VideoGridProps {
  tileSize?: TileSize;
  trackRefs?: TrackReference[];
}

const gridClasses: Record<TileSize, string> = {
  small: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  medium: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  large: "grid-cols-1 lg:grid-cols-2",
};

export function getVideoGridClasses(tileSize: TileSize): string {
  return gridClasses[tileSize];
}

function getTrackId(trackRef: TrackReference): string {
  return (
    trackRef.publication?.trackSid ??
    trackRef.publication?.track?.sid ??
    trackRef.participant.identity
  );
}

function getTrackLabel(trackRef: TrackReference): string {
  const participantName =
    trackRef.participant.name || trackRef.participant.identity;
  const trackName = trackRef.publication?.trackName;

  return trackName && trackName !== participantName
    ? `${participantName} - ${trackName}`
    : participantName;
}

export function VideoGrid({ tileSize = "medium", trackRefs }: VideoGridProps) {
  const [expandedTrackIds, setExpandedTrackIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [hiddenTrackIds, setHiddenTrackIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Get all video tracks from participants
  const liveTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: true,
  });

  const videoTracks = (trackRefs ?? liveTracks).filter(
    (trackRef) => trackRef.publication?.track !== undefined,
  );
  const videoTrackIds = videoTracks.map(getTrackId);
  const visibleVideoTracks = videoTracks.filter(
    (trackRef) => !hiddenTrackIds.has(getTrackId(trackRef)),
  );
  const selectedTrackCount = visibleVideoTracks.length;

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
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Visible cameras</div>
            <div className="text-xs text-neutral-400">
              Showing {selectedTrackCount} of {videoTracks.length}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHiddenTrackIds(new Set())}
              disabled={selectedTrackCount === videoTracks.length}
            >
              Select all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHiddenTrackIds(new Set(videoTrackIds))}
              disabled={selectedTrackCount === 0}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {videoTracks.map((trackRef) => {
            const trackId = getTrackId(trackRef);
            const selected = !hiddenTrackIds.has(trackId);

            return (
              <button
                key={trackId}
                type="button"
                onClick={() => {
                  setHiddenTrackIds((previousHiddenTrackIds) => {
                    const nextHiddenTrackIds = new Set(previousHiddenTrackIds);
                    if (nextHiddenTrackIds.has(trackId)) {
                      nextHiddenTrackIds.delete(trackId);
                    } else {
                      nextHiddenTrackIds.add(trackId);
                    }
                    return nextHiddenTrackIds;
                  });
                }}
                className={cn(
                  "inline-flex max-w-full items-center gap-2 rounded-md border px-3 py-1.5 text-left text-xs font-medium transition-colors",
                  selected
                    ? "border-neutral-600 bg-neutral-800 text-neutral-50"
                    : "border-neutral-800 bg-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100",
                )}
                aria-pressed={selected}
                title={getTrackLabel(trackRef)}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    selected
                      ? "border-neutral-300 bg-neutral-100 text-neutral-950"
                      : "border-neutral-700",
                  )}
                >
                  {selected ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="truncate">{getTrackLabel(trackRef)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {visibleVideoTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 py-16">
          <VideoOff className="mb-4 h-12 w-12 text-neutral-600" />
          <h3 className="mb-2 text-lg font-medium">No Cameras Selected</h3>
          <p className="max-w-md text-center text-neutral-400">
            Select one or more cameras above to show video feeds.
          </p>
        </div>
      ) : (
        <div className={cn("grid gap-4", getVideoGridClasses(tileSize))}>
          {visibleVideoTracks.map((trackRef) => {
            const trackId = getTrackId(trackRef);
            const showStats = expandedTrackIds.has(trackId);

            return (
              <VideoTile
                key={trackId}
                trackRef={trackRef}
                showStats={showStats}
                onToggleStats={() => {
                  setExpandedTrackIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(trackId)) {
                      next.delete(trackId);
                    } else {
                      next.add(trackId);
                    }
                    return next;
                  });
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
