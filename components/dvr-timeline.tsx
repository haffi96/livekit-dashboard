"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface DvrTimelineProps {
  currentTime: number;
  duration: number;
  isAtLiveEdge: boolean;
  isRecording: boolean;
  onSeek: (time: number) => void;
  onGoLive: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DvrTimeline({
  currentTime,
  duration,
  isAtLiveEdge,
  isRecording,
  onSeek,
  onGoLive,
}: DvrTimelineProps) {
  const [isDragging, setIsDragging] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 100;
  const behindLive = duration - currentTime;

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      onSeek((val / 100) * duration);
    },
    [duration, onSeek],
  );

  if (!isRecording) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2">
      {/* Time position */}
      <span className="min-w-[3rem] text-xs text-neutral-400 tabular-nums">
        {formatTime(currentTime)}
      </span>

      {/* Scrubber */}
      <div className="relative flex flex-1 items-center">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          className={cn(
            "h-1 w-full cursor-pointer appearance-none rounded-full bg-neutral-700",
            "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
            isDragging
              ? "[&::-webkit-slider-thumb]:bg-blue-400"
              : "[&::-webkit-slider-thumb]:bg-blue-500",
          )}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #404040 ${progress}%, #404040 100%)`,
          }}
        />
      </div>

      {/* Duration */}
      <span className="min-w-[3rem] text-right text-xs text-neutral-400 tabular-nums">
        {formatTime(duration)}
      </span>

      {/* Behind-live indicator */}
      {!isAtLiveEdge && behindLive > 1 && (
        <Badge variant="secondary" className="text-xs">
          -{formatTime(behindLive)}
        </Badge>
      )}

      {/* Live button */}
      <Button
        variant={isAtLiveEdge ? "default" : "outline"}
        size="sm"
        onClick={onGoLive}
        className={cn(
          "gap-1 text-xs",
          isAtLiveEdge && "bg-red-600 hover:bg-red-700",
        )}
      >
        <Radio className="h-3 w-3" />
        LIVE
      </Button>
    </div>
  );
}
