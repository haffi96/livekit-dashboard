"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatLatencyMs, formatSize } from "@/lib/data-display";
import { cn } from "@/lib/utils";
import type { RemoteDataTrackEntry } from "@/hooks/use-data-tracks";

interface DataTrackListProps {
  tracks: RemoteDataTrackEntry[];
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string | null) => void;
  onPause: (trackId: string) => void;
  onResume: (trackId: string) => void;
}

function getStateClassName(state: RemoteDataTrackEntry["subscriptionState"]) {
  switch (state) {
    case "subscribed":
      return "border-emerald-700/70 text-emerald-300";
    case "auto-subscribing":
      return "border-sky-700/70 text-sky-300";
    case "paused":
      return "border-amber-700/70 text-amber-300";
    case "ended":
      return "border-neutral-700 text-neutral-400";
    case "error":
      return "border-red-700/70 text-red-300";
  }
}

export function DataTrackList({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onPause,
  onResume,
}: DataTrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center text-neutral-500">
        No data tracks published yet. Waiting for remote publishers...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track) => {
        const isSelected = selectedTrackId === track.id;
        const canPause = track.subscriptionState === "subscribed";
        const canResume =
          track.isPublished &&
          (track.subscriptionState === "paused" ||
            track.subscriptionState === "error" ||
            track.subscriptionState === "ended");

        return (
          <div
            key={track.id}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              isSelected
                ? "border-cyan-500/70 bg-cyan-500/10"
                : "border-neutral-800 bg-neutral-900",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onSelectTrack(isSelected ? null : track.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-neutral-100">
                    {track.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", getStateClassName(track.subscriptionState))}
                  >
                    {track.subscriptionState}
                  </Badge>
                  {!track.isPublished && (
                    <Badge variant="outline" className="text-[10px] text-neutral-400">
                      unpublished
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-neutral-400">
                  {track.publisherIdentity}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>{track.stats.frameCount} frames</span>
                  <span>{track.stats.currentRate.toFixed(1)} Hz</span>
                  <span>{formatSize(track.stats.averageSize)} avg</span>
                  {track.stats.lastLatencyMs !== null && (
                    <span>{formatLatencyMs(track.stats.lastLatencyMs)} latency</span>
                  )}
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-2">
                {canPause && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPause(track.id)}
                    className="border-neutral-700 bg-neutral-900"
                  >
                    Pause
                  </Button>
                )}
                {canResume && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResume(track.id)}
                    className="border-cyan-700/70 bg-cyan-950/30 text-cyan-100 hover:bg-cyan-950/50"
                  >
                    Resume
                  </Button>
                )}
              </div>
            </div>
            {track.lastError && (
              <div className="mt-2 rounded border border-red-900/50 bg-red-950/20 px-2 py-1 text-xs text-red-300">
                {track.lastError}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
