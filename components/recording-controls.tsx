"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  RecordingSession,
  RecordingTrackInput,
} from "@/lib/recording-session";
import { Circle, Square, AlertCircle, Info } from "lucide-react";

interface RecordingControlsProps {
  roomName: string;
  tracks: RecordingTrackInput[];
  onRecordingStateChange?: (state: {
    session: RecordingSession | null;
    isRecording: boolean;
  }) => void;
}

interface EgressItem {
  egressId: string;
  status: number;
  roomName: string;
  startedAt?: number;
}

// EgressStatus enum values from LiveKit proto
const EGRESS_STARTING = 0;
const EGRESS_ACTIVE = 1;

export function RecordingControls({
  roomName,
  tracks,
  onRecordingStateChange,
}: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [egressIds, setEgressIds] = useState<string[]>([]);
  const [recordingSession, setRecordingSession] =
    useState<RecordingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gcsConfigured, setGcsConfigured] = useState<boolean | null>(null);
  const onRecordingStateChangeRef = useRef(onRecordingStateChange);

  useEffect(() => {
    onRecordingStateChangeRef.current = onRecordingStateChange;
  }, [onRecordingStateChange]);

  useEffect(() => {
    fetch("/api/egress/status")
      .then((r) => r.json())
      .then((d) => setGcsConfigured(d.gcsConfigured))
      .catch(() => setGcsConfigured(false));
  }, []);

  const syncRecordingState = useCallback(async () => {
    try {
      const [listRes, latestRes] = await Promise.all([
        fetch("/api/egress/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        }),
        fetch(`/api/egress/latest?roomName=${encodeURIComponent(roomName)}`),
      ]);
      const [listData, latestData] = await Promise.all([
        listRes.json(),
        latestRes.json(),
      ]);

      const activeItems = ((listData.items as EgressItem[]) ?? []).filter(
        (item) => item.status === EGRESS_ACTIVE || item.status === EGRESS_STARTING,
      );
      const session = (latestData.session as RecordingSession | null) ?? null;

      setIsRecording(activeItems.length > 0);
      setEgressIds(activeItems.map((item) => item.egressId));
      setRecordingSession(session);
      onRecordingStateChangeRef.current?.({
        session,
        isRecording: activeItems.length > 0,
      });
    } catch {
      // ignore
    }
  }, [roomName]);

  useEffect(() => {
    if (gcsConfigured) {
      void syncRecordingState();
    }
  }, [gcsConfigured, syncRecordingState]);

  const startRecording = async () => {
    if (tracks.length === 0) {
      setError("No camera tracks available to record.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/egress/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, tracks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const session = data.session as RecordingSession;
      setIsRecording(true);
      setRecordingSession(session);
      setEgressIds(session.tracks.map((track) => track.egressId));
      onRecordingStateChangeRef.current?.({ session, isRecording: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = async () => {
    if (!recordingSession || egressIds.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/egress/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          sessionId: recordingSession.sessionId,
          egressIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const session =
        (data.session as RecordingSession | null) ?? recordingSession;
      setIsRecording(false);
      setRecordingSession(session);
      setEgressIds([]);
      onRecordingStateChangeRef.current?.({ session, isRecording: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop");
    } finally {
      setIsLoading(false);
    }
  };

  if (gcsConfigured === null) return null;

  if (!gcsConfigured) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs text-neutral-400">
        <AlertCircle className="h-3 w-3" />
        Recording unavailable
      </Badge>
    );
  }

  const storageNotice = (
    <div className="group relative">
      <button
        type="button"
        aria-label="Recording storage notice"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-56 rounded-md border border-neutral-800 bg-neutral-950/95 p-2 text-[11px] leading-4 text-neutral-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        Recordings are saved in a private GCS bucket.
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}

      {isRecording ? (
        <>
          <Badge variant="destructive" className="animate-pulse gap-1">
            <Circle className="h-2 w-2 fill-current" />
            REC
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={stopRecording}
            disabled={isLoading}
            className="gap-1"
          >
            <Square className="h-3 w-3" />
            Stop
          </Button>
          {storageNotice}
        </>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={startRecording}
            disabled={isLoading || tracks.length === 0}
            className="gap-1"
          >
            <Circle className="h-3 w-3 fill-red-500 text-red-500" />
            Record
          </Button>
          {storageNotice}
        </>
      )}
    </div>
  );
}
