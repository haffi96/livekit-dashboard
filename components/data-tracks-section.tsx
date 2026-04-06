"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Radio,
  SatelliteDish,
  Send,
} from "lucide-react";
import {
  SERIALIZATION_MODE_OPTIONS,
  type SerializationMode,
} from "@/lib/data-serialization";
import { cn } from "@/lib/utils";
import { useDataTracks } from "@/hooks/use-data-tracks";
import { DataTrackList } from "./data-track-list";
import { DataTrackPanel } from "./data-track-panel";
import { DataTrackPublisher } from "./data-track-publisher";

export function DataTracksSection() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [senderMode, setSenderMode] = useState<SerializationMode>("json-only");
  const [receiverMode, setReceiverMode] =
    useState<SerializationMode>("json-only");
  const [showPublisher, setShowPublisher] = useState(false);
  const [showReceiver, setShowReceiver] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const {
    remoteTracks,
    localTracks,
    getRemoteTrackEntry,
    getRemoteTrackFrames,
    pauseRemoteTrack,
    resumeRemoteTrack,
    publishLocalTrack,
    unpublishLocalTrack,
    pushFrameToTrack,
    hasRemoteTracks,
  } = useDataTracks(receiverMode);

  const effectiveSelectedTrackId = remoteTracks.some(
    (track) => track.id === selectedTrackId,
  )
    ? selectedTrackId
    : (remoteTracks[0]?.id ?? null);

  const selectedTrack = useMemo(() => {
    return effectiveSelectedTrackId
      ? getRemoteTrackEntry(effectiveSelectedTrackId)
      : null;
  }, [effectiveSelectedTrackId, getRemoteTrackEntry]);

  const totalTrackCount =
    remoteTracks.filter((track) => track.isPublished).length + localTracks.length;
  const hasVisibleRemoteTracks = remoteTracks.some((track) => track.isPublished);

  useEffect(() => {
    setShowReceiver(hasVisibleRemoteTracks);
  }, [hasVisibleRemoteTracks]);

  return (
    <section className="rounded-xl border border-cyan-950/60 bg-linear-to-br from-cyan-950/20 via-neutral-950 to-neutral-950 p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="h-auto w-full items-start justify-between gap-3 whitespace-normal px-0 py-1 text-left text-neutral-100 hover:bg-transparent hover:text-neutral-50"
      >
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-sm font-semibold">Data Tracks</div>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            Published lossy tracks with explicit subscribe, publish, and unpublish lifecycle.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <Badge variant="outline" className="text-xs text-cyan-200">
            {totalTrackCount} active track{totalTrackCount !== 1 ? "s" : ""}
          </Badge>
          <ChevronRight
            className={cn(
              "h-4 w-4 text-neutral-400 transition-transform",
              !isCollapsed && "rotate-90",
            )}
          />
        </div>
      </Button>

      {!isCollapsed && (
        <>
      <div className="mt-4 border-t border-cyan-950/40 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPublisher((prev) => !prev)}
          className="w-full justify-between text-neutral-400 hover:text-neutral-200"
        >
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Publisher
          </span>
          {showPublisher ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        {showPublisher && (
          <div className="mt-3 space-y-3">
            <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <p className="text-xs text-neutral-400">Track Sender Serialization</p>
              <div className="flex flex-wrap gap-2">
                {SERIALIZATION_MODE_OPTIONS.map((mode) => (
                  <button
                    key={`track-sender-${mode.value}`}
                    onClick={() => setSenderMode(mode.value)}
                    className={cn(
                      "rounded px-2 py-1 text-xs transition-colors",
                      senderMode === mode.value
                        ? "bg-cyan-600 text-white"
                        : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600",
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <DataTrackPublisher
              senderMode={senderMode}
              localTracks={localTracks}
              onPublishTrack={publishLocalTrack}
              onUnpublishTrack={unpublishLocalTrack}
              onPushFrame={pushFrameToTrack}
            />
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-cyan-950/40 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReceiver((prev) => !prev)}
          className="w-full justify-between text-neutral-400 hover:text-neutral-200"
        >
          <span className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Receiver
          </span>
          {showReceiver ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        {showReceiver && (
          <div className="mt-3 space-y-3">
            <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <p className="text-xs text-neutral-400">Track Receiver Serialization</p>
              <div className="flex flex-wrap gap-2">
                {SERIALIZATION_MODE_OPTIONS.map((mode) => (
                  <button
                    key={`track-receiver-${mode.value}`}
                    onClick={() => setReceiverMode(mode.value)}
                    className={cn(
                      "rounded px-2 py-1 text-xs transition-colors",
                      receiverMode === mode.value
                        ? "bg-teal-600 text-white"
                        : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600",
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <DataTrackList
              tracks={remoteTracks}
              selectedTrackId={effectiveSelectedTrackId}
              onSelectTrack={setSelectedTrackId}
              onPause={pauseRemoteTrack}
              onResume={resumeRemoteTrack}
            />

            {selectedTrack && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <SatelliteDish className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-neutral-300">
                    {selectedTrack.name}
                  </span>
                </div>
                <DataTrackPanel
                  track={selectedTrack}
                  frames={getRemoteTrackFrames(selectedTrack.id)}
                />
              </div>
            )}

            {!selectedTrack && hasRemoteTracks && (
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4 text-center text-sm text-neutral-400">
                Select a track above to view its frames.
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}
    </section>
  );
}
