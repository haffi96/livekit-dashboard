"use client";

import { useState } from "react";
import { useTracks, type TrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import { VideoTile } from "./video-tile";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Video,
  VideoOff,
} from "lucide-react";
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
  const [showCameraOptions, setShowCameraOptions] = useState(false);

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
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCameraOptions((show) => !show)}
          className="h-7 gap-1 px-2 text-xs text-neutral-400 hover:text-neutral-50"
          aria-expanded={showCameraOptions}
        >
          {showCameraOptions ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          Cameras {selectedTrackCount}/{videoTracks.length}
        </Button>

        {showCameraOptions ? (
          <div className="rounded-md border border-neutral-800 bg-neutral-950/40 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs text-neutral-500">
                Select cameras to show
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHiddenTrackIds(new Set())}
                  disabled={selectedTrackCount === videoTracks.length}
                  className="h-7 px-2 text-xs"
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHiddenTrackIds(new Set(videoTrackIds))}
                  disabled={selectedTrackCount === 0}
                  className="h-7 px-2 text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {videoTracks.map((trackRef) => {
                const trackId = getTrackId(trackRef);
                const selected = !hiddenTrackIds.has(trackId);

                return (
                  <button
                    key={trackId}
                    type="button"
                    onClick={() => {
                      setHiddenTrackIds((previousHiddenTrackIds) => {
                        const nextHiddenTrackIds = new Set(
                          previousHiddenTrackIds,
                        );
                        if (nextHiddenTrackIds.has(trackId)) {
                          nextHiddenTrackIds.delete(trackId);
                        } else {
                          nextHiddenTrackIds.add(trackId);
                        }
                        return nextHiddenTrackIds;
                      });
                    }}
                    className={cn(
                      "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-left text-xs font-medium transition-colors",
                      selected
                        ? "border-neutral-700 bg-neutral-800/70 text-neutral-100"
                        : "border-neutral-800 bg-transparent text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200",
                    )}
                    aria-pressed={selected}
                    title={getTrackLabel(trackRef)}
                  >
                    <span
                      className={cn(
                        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                        selected
                          ? "border-neutral-400 text-neutral-100"
                          : "border-neutral-700",
                      )}
                    >
                      {selected ? <Check className="h-2.5 w-2.5" /> : null}
                    </span>
                    <span className="truncate">{getTrackLabel(trackRef)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {visibleVideoTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 py-16">
          <VideoOff className="mb-4 h-12 w-12 text-neutral-600" />
          <h3 className="mb-2 text-lg font-medium">No Cameras Selected</h3>
          <p className="max-w-md text-center text-neutral-400">
            Select one or more cameras above to show video feeds.
          </p>
          {!showCameraOptions ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCameraOptions(true)}
              className="mt-4"
            >
              Choose cameras
            </Button>
          ) : null}
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
