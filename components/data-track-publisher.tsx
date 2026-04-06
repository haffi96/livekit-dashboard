"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Send, Square, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocalDataTrackEntry } from "@/hooks/use-data-tracks";
import type { SerializationMode } from "@/lib/data-serialization";
import { formatTime } from "@/lib/data-display";

interface DataTrackPublisherProps {
  senderMode: SerializationMode;
  localTracks: LocalDataTrackEntry[];
  onPublishTrack: (name: string) => Promise<string>;
  onUnpublishTrack: (sid: string) => Promise<void>;
  onPushFrame: (args: {
    sid: string;
    payloadText: string;
    senderMode: SerializationMode;
    includeUserTimestamp: boolean;
  }) => Promise<void>;
}

const textEncoder = new TextEncoder();

export function DataTrackPublisher({
  senderMode,
  localTracks,
  onPublishTrack,
  onUnpublishTrack,
  onPushFrame,
}: DataTrackPublisherProps) {
  const [trackName, setTrackName] = useState("");
  const [selectedTrackSid, setSelectedTrackSid] = useState<string | null>(null);
  const [payload, setPayload] = useState('{\n  "message": "Telemetry sample"\n}');
  const [frequency, setFrequency] = useState(0);
  const [includeUserTimestamp, setIncludeUserTimestamp] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [framesSent, setFramesSent] = useState(0);
  const [createError, setCreateError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoopActiveRef = useRef(false);

  const clearScheduledSend = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopSending = useCallback(() => {
    isLoopActiveRef.current = false;
    clearScheduledSend();
    setIsSending(false);
  }, [clearScheduledSend]);

  useEffect(() => {
    return () => {
      stopSending();
    };
  }, [stopSending]);

  const validateJson = useCallback((text: string) => {
    if (!text.trim()) {
      return { valid: false, error: "Payload cannot be empty" };
    }
    try {
      JSON.parse(text);
      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid JSON" };
    }
  }, []);

  const jsonValidation = validateJson(payload);
  const effectiveSelectedTrackSid = localTracks.some(
    (track) => track.sid === selectedTrackSid,
  )
    ? selectedTrackSid
    : (localTracks[0]?.sid ?? null);
  const selectedTrack =
    localTracks.find((track) => track.sid === effectiveSelectedTrackSid) ?? null;
  const estimatedBytes = textEncoder.encode(payload).byteLength;

  const sendFrame = useCallback(async () => {
    if (!effectiveSelectedTrackSid) {
      setLastError("Select a track first");
      return false;
    }
    if (!jsonValidation.valid) {
      setLastError(jsonValidation.error ?? "Invalid JSON");
      return false;
    }

    try {
      await onPushFrame({
        sid: effectiveSelectedTrackSid,
        payloadText: payload,
        senderMode,
        includeUserTimestamp,
      });
      setFramesSent((prev) => prev + 1);
      setLastError(null);
      return true;
    } catch (error) {
      setLastError(
        error instanceof Error ? error.message : "Failed to push frame",
      );
      return false;
    }
  }, [
    includeUserTimestamp,
    jsonValidation.error,
    jsonValidation.valid,
    onPushFrame,
    payload,
    effectiveSelectedTrackSid,
    senderMode,
  ]);

  const startSending = useCallback(async () => {
    if (isLoopActiveRef.current) {
      return;
    }
    if (!effectiveSelectedTrackSid) {
      setLastError("Publish or select a track first");
      return;
    }
    if (!jsonValidation.valid) {
      setLastError(jsonValidation.error ?? "Invalid JSON");
      return;
    }

    if (frequency <= 0) {
      setFramesSent(0);
      await sendFrame();
      return;
    }

    const intervalMs = Math.max(1, Math.round(1000 / frequency));
    setFramesSent(0);
    setLastError(null);
    isLoopActiveRef.current = true;
    setIsSending(true);

    const run = async () => {
      if (!isLoopActiveRef.current) {
        return;
      }
      await sendFrame();
      if (!isLoopActiveRef.current) {
        return;
      }
      timeoutRef.current = setTimeout(() => {
        void run();
      }, intervalMs);
    };

    void run();
  }, [
    frequency,
    jsonValidation.error,
    jsonValidation.valid,
    effectiveSelectedTrackSid,
    sendFrame,
  ]);

  async function handleCreateTrack() {
    const trimmedName = trackName.trim();
    if (!trimmedName) {
      setCreateError("Track name is required");
      return;
    }

    try {
      const sid = await onPublishTrack(trimmedName);
      setSelectedTrackSid(sid);
      setTrackName("");
      setCreateError(null);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to publish track",
      );
    }
  }

  async function handleUnpublishTrack(sid: string) {
    try {
      if (sid === effectiveSelectedTrackSid) {
        stopSending();
      }
      await onUnpublishTrack(sid);
      setLastError(null);
      setCreateError(null);
    } catch (error) {
      setLastError(
        error instanceof Error ? error.message : "Failed to unpublish track",
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Track Publisher</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">New Track Name</Label>
              <Input
                value={trackName}
                onChange={(event) => setTrackName(event.target.value)}
                placeholder="e.g., telemetry.gps"
                className="border-neutral-700 bg-neutral-800 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void handleCreateTrack()} size="sm">
                Publish
              </Button>
            </div>
          </div>

          {createError && (
            <div className="rounded border border-red-800 bg-red-900/20 p-2 text-xs text-red-400">
              {createError}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-neutral-400">Local Tracks</Label>
              <Badge variant="outline" className="text-xs text-neutral-300">
                {localTracks.length} published
              </Badge>
            </div>
            {localTracks.length === 0 ? (
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-500">
                No local data tracks published yet.
              </div>
            ) : (
              <div className="space-y-2">
                {localTracks.map((track) => {
                        const isSelected = effectiveSelectedTrackSid === track.sid;
                  return (
                    <div
                      key={track.sid}
                      className={cn(
                        "flex items-start justify-between rounded-lg border p-3",
                        isSelected
                          ? "border-cyan-500/70 bg-cyan-500/10"
                          : "border-neutral-800 bg-neutral-950",
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setSelectedTrackSid(track.sid)}
                      >
                        <div className="font-mono text-sm text-neutral-100">
                          {track.name}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          SID: {track.sid}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                          <span>{track.framesSent} frames sent</span>
                          {track.lastSent && <span>last: {formatTime(track.lastSent)}</span>}
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleUnpublishTrack(track.sid)}
                        className="border-red-900/60 bg-red-950/20 text-red-200 hover:bg-red-950/40"
                      >
                        Unpublish
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">Push Frames</CardTitle>
            {selectedTrack && (
              <Badge variant="outline" className="text-xs text-cyan-200">
                {selectedTrack.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Selected Track</Label>
              <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300">
                {selectedTrack?.name ?? "None selected"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Frequency (Hz)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={frequency}
                onChange={(event) =>
                  setFrequency(parseFloat(event.target.value) || 0)
                }
                onWheel={(event) => (event.target as HTMLInputElement).blur()}
                disabled={isSending}
                className="[appearance:textfield] border-neutral-700 bg-neutral-800 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-neutral-400">JSON Payload</Label>
              <div className="flex items-center gap-1">
                {jsonValidation.valid ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={cn(
                    "text-xs",
                    jsonValidation.valid ? "text-green-500" : "text-red-500",
                  )}
                >
                  {jsonValidation.valid ? "Valid JSON" : jsonValidation.error}
                </span>
              </div>
            </div>
            <textarea
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              disabled={isSending}
              rows={5}
              className="w-full resize-none rounded-md border border-neutral-700 bg-neutral-800 p-2 font-mono text-xs text-neutral-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
              <span>Approx. raw payload size: {estimatedBytes} B</span>
              <span>Data tracks are most reliable below roughly 1200 B per frame.</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-cyan-300" />
                <span className="text-sm text-neutral-200">Attach user timestamp</span>
              </div>
              <p className="text-xs text-neutral-500">
                Adds a sender timestamp so the receiver can estimate one-way latency.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIncludeUserTimestamp((prev) => !prev)}
              disabled={isSending}
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                includeUserTimestamp
                  ? "bg-cyan-600 text-white"
                  : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600",
              )}
            >
              {includeUserTimestamp ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-400">
              Sender mode: <span className="text-neutral-200">{senderMode}</span>
            </div>
            {isSending ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={stopSending}
                className="gap-1"
              >
                <Square className="h-3 w-3" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  void startSending();
                }}
                disabled={!effectiveSelectedTrackSid || !jsonValidation.valid}
                className="gap-1 bg-cyan-600 text-white hover:bg-cyan-500"
              >
                <Send className="h-3 w-3" />
                {frequency > 0 ? "Start" : "Push"}
              </Button>
            )}
          </div>

          {lastError && (
            <div className="rounded border border-red-800 bg-red-900/20 p-2 text-xs text-red-400">
              {lastError}
            </div>
          )}

          {framesSent > 0 && (
            <div className="text-xs text-neutral-400">
              Frames sent: <span className="font-medium text-neutral-200">{framesSent}</span>
              {frequency > 0 && isSending && <span className="ml-2">at {frequency} Hz</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
