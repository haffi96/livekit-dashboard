"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Circle, Square, AlertCircle } from "lucide-react";

interface RecordingControlsProps {
  roomName: string;
  onRecordingStarted?: () => void;
  onRecordingStopped?: () => void;
}

interface EgressItem {
  egressId: string;
  status: number;
  roomName: string;
}

// EgressStatus enum values from LiveKit proto
const EGRESS_ACTIVE = 0;
const EGRESS_STARTING = 4;

export function RecordingControls({
  roomName,
  onRecordingStarted,
  onRecordingStopped,
}: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [egressId, setEgressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gcsConfigured, setGcsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/egress/status")
      .then((r) => r.json())
      .then((d) => setGcsConfigured(d.gcsConfigured))
      .catch(() => setGcsConfigured(false));
  }, []);

  const checkActiveEgress = useCallback(async () => {
    try {
      const res = await fetch("/api/egress/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });
      const data = await res.json();
      const active = (data.items as EgressItem[])?.find(
        (e) => e.status === EGRESS_ACTIVE || e.status === EGRESS_STARTING,
      );
      if (active) {
        setIsRecording(true);
        setEgressId(active.egressId);
        onRecordingStarted?.();
      }
    } catch {
      // ignore
    }
  }, [roomName, onRecordingStarted]);

  useEffect(() => {
    if (gcsConfigured) checkActiveEgress();
  }, [gcsConfigured, checkActiveEgress]);

  const startRecording = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/egress/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsRecording(true);
      setEgressId(data.egressId);
      onRecordingStarted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = async () => {
    if (!egressId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/egress/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ egressId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsRecording(false);
      setEgressId(null);
      onRecordingStopped?.();
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
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={startRecording}
          disabled={isLoading}
          className="gap-1"
        >
          <Circle className="h-3 w-3 fill-red-500 text-red-500" />
          Record
        </Button>
      )}
    </div>
  );
}
