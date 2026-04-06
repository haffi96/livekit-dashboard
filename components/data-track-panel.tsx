"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Clock,
  Gauge,
  RadioTower,
  TimerReset,
  User,
} from "lucide-react";
import type {
  DataTrackFrameMessage,
  RemoteDataTrackEntry,
} from "@/hooks/use-data-tracks";
import {
  formatLatencyMs,
  formatSize,
  formatTime,
} from "@/lib/data-display";
import { cn } from "@/lib/utils";

interface DataTrackPanelProps {
  track: RemoteDataTrackEntry;
  frames: DataTrackFrameMessage[];
}

export function DataTrackPanel({ track, frames }: DataTrackPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-neutral-400">
              <Gauge className="h-4 w-4" />
              <span className="text-xs">Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {track.stats.currentRate.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-neutral-400">
                Hz
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-neutral-400">
              <RadioTower className="h-4 w-4" />
              <span className="text-xs">Avg Size</span>
            </div>
            <div className="text-2xl font-bold">
              {formatSize(track.stats.averageSize)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-neutral-400">
              <Activity className="h-4 w-4" />
              <span className="text-xs">Total Frames</span>
            </div>
            <div className="text-2xl font-bold">{track.stats.frameCount}</div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-neutral-400">
              <TimerReset className="h-4 w-4" />
              <span className="text-xs">Last Latency</span>
            </div>
            <div className="break-all text-sm font-medium">
              {formatLatencyMs(track.stats.lastLatencyMs)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">Track Stream</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs text-cyan-200">
                {track.name}
              </Badge>
              <Badge variant="outline" className="text-xs text-neutral-300">
                {track.subscriptionState}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {track.publisherIdentity}
            </span>
            <span className="break-all">SID: {track.sid}</span>
            {track.stats.lastReceived && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(track.stats.lastReceived)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96 space-y-2 overflow-y-auto font-mono text-xs">
            {frames.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-neutral-500">
                <Activity className="mb-2 h-8 w-8" />
                <p>Waiting for frames on this track...</p>
              </div>
            ) : (
              frames.map((frame) => (
                <div
                  key={frame.id}
                  className="rounded border border-neutral-700 bg-neutral-800 p-2"
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-neutral-400">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{formatTime(frame.timestamp)}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          frame.decodeState === "ok"
                            ? "border-cyan-700/70 text-cyan-300"
                            : "border-red-700/70 text-red-300",
                        )}
                      >
                        {frame.decodeState === "ok" ? "decoded" : "decode error"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{formatSize(frame.size)}</span>
                      {frame.latencyMs !== null && (
                        <span>{formatLatencyMs(frame.latencyMs)}</span>
                      )}
                    </div>
                  </div>
                  <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] text-neutral-500">
                    <span className="break-all">Raw: {frame.rawPreview}</span>
                    {frame.userTimestamp && (
                      <span className="break-all">User TS: {frame.userTimestamp}</span>
                    )}
                  </div>
                  <pre className="overflow-hidden break-all whitespace-pre-wrap text-neutral-200">
                    {frame.decodedData.length > 1200
                      ? `${frame.decodedData.substring(0, 1200)}...`
                      : frame.decodedData}
                  </pre>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
