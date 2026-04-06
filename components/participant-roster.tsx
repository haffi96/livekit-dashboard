"use client";

import { useState } from "react";
import { useParticipants } from "@livekit/components-react";
import type { LocalParticipant, RemoteParticipant } from "livekit-client";
import {
  ChevronRight,
  ChevronDown,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ParticipantRosterProps {
  isReplayMode: boolean;
}

type RoomParticipant = LocalParticipant | RemoteParticipant;

const joinedAtFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function getParticipantLabel(participant: RoomParticipant): string {
  return participant.name || participant.identity;
}

function isObserverParticipant(participant: RoomParticipant): boolean {
  return participant.attributes.dashboardRole === "observer";
}

function sortParticipants(a: RoomParticipant, b: RoomParticipant): number {
  const localDifference = Number(b.isLocal) - Number(a.isLocal);
  if (localDifference !== 0) {
    return localDifference;
  }

  const observerDifference =
    Number(isObserverParticipant(a)) - Number(isObserverParticipant(b));
  if (observerDifference !== 0) {
    return observerDifference;
  }

  const cameraDifference =
    Number(b.isCameraEnabled) - Number(a.isCameraEnabled);
  if (cameraDifference !== 0) {
    return cameraDifference;
  }

  const speakingDifference = Number(b.isSpeaking) - Number(a.isSpeaking);
  if (speakingDifference !== 0) {
    return speakingDifference;
  }

  return getParticipantLabel(a).localeCompare(getParticipantLabel(b));
}

function formatJoinedAt(joinedAt?: Date): string {
  if (!joinedAt) {
    return "Joined time unavailable";
  }

  return `Joined ${joinedAtFormatter.format(joinedAt)}`;
}

export function ParticipantRoster({ isReplayMode }: ParticipantRosterProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const participants = useParticipants();
  const sortedParticipants = [...participants].sort(sortParticipants);

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed((current) => !current)}
              className="-ml-3 h-8 gap-2 px-3 text-base font-semibold"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Participants
            </Button>
            <Badge
              variant="outline"
              className="border-neutral-700 text-neutral-200"
            >
              {sortedParticipants.length} connected
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-400">
            {isReplayMode
              ? "Current live participants in this room while replay is active"
              : "Current live participants in this room"}
          </p>
        </div>
      </div>

      {isCollapsed ? null : sortedParticipants.length === 0 ? (
        <Card className="border-dashed border-neutral-800 bg-neutral-950">
          <CardContent className="py-6 text-center text-sm text-neutral-400">
            No participants connected
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sortedParticipants.map((participant) => {
            const participantLabel = getParticipantLabel(participant);
            const trackCount = participant.getTrackPublications().length;
            const observer = isObserverParticipant(participant);
            const isYou = participant.isLocal;

            return (
              <Card
                key={participant.sid}
                className="border-neutral-800 bg-neutral-900"
              >
                <CardHeader className="gap-2 p-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm">
                        {participantLabel}
                        {isYou ? " (You)" : ""}
                      </CardTitle>
                      <CardDescription
                        className="mt-0.5 truncate font-mono text-[11px] text-neutral-400"
                        title={participant.identity}
                      >
                        {participant.identity}
                      </CardDescription>
                    </div>
                    {participant.isSpeaking ? (
                      <Badge variant="success" className="shrink-0 text-[11px]">
                        Speaking
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant={
                        participant.isCameraEnabled ? "secondary" : "outline"
                      }
                      className="gap-1 border-neutral-700 px-2 py-0.5 text-[11px]"
                    >
                      {participant.isCameraEnabled ? (
                        <Video className="h-3 w-3" />
                      ) : (
                        <VideoOff className="h-3 w-3" />
                      )}
                      {participant.isCameraEnabled ? "Camera" : "No camera"}
                    </Badge>
                    <Badge
                      variant={
                        participant.isMicrophoneEnabled
                          ? "secondary"
                          : "outline"
                      }
                      className="gap-1 border-neutral-700 px-2 py-0.5 text-[11px]"
                    >
                      {participant.isMicrophoneEnabled ? (
                        <Mic className="h-3 w-3" />
                      ) : (
                        <MicOff className="h-3 w-3" />
                      )}
                      {participant.isMicrophoneEnabled ? "Mic" : "Muted"}
                    </Badge>
                    {observer ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-neutral-700 px-2 py-0.5 text-[11px]"
                      >
                        {isYou ? "You" : "Observer"}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                    <span>{formatJoinedAt(participant.joinedAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Volume2 className="h-3.5 w-3.5" />
                      {trackCount} published track{trackCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
