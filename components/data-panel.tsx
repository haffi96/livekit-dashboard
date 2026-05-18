"use client";

import { useCallback, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataPacketsSection } from "./data-packets-section";
import { DataTracksSection } from "./data-tracks-section";
import { useVideoRttPublisher } from "@/hooks/use-video-rtt-publisher";

export function DataPanel() {
  const [isSendingRtpTimestamps, setIsSendingRtpTimestamps] = useState(false);
  const [rtpTimestampActivity, setRtpTimestampActivity] = useState<
    Map<string, { count: number; lastSent: number }>
  >(new Map());

  const handleRtpTimestampPublish = useCallback(
    (topic: string, timestamp: number) => {
      setRtpTimestampActivity((prev) => {
        const next = new Map(prev);
        const current = next.get(topic);
        next.set(topic, {
          count: (current?.count ?? 0) + 1,
          lastSent: timestamp,
        });
        return next;
      });
    },
    [],
  );

  useVideoRttPublisher(isSendingRtpTimestamps, handleRtpTimestampPublish);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-200">
              RTP Timestamp Sender
            </div>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Publishes extracted video frame RTP timestamp samples on
              rtp.timestamp.
            </p>
          </div>
          <Button
            variant={isSendingRtpTimestamps ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsSendingRtpTimestamps((prev) => !prev)}
            className="shrink-0 gap-2"
            title="Publish packet trailer frame metrics on rtp.timestamp"
          >
            <Send className="h-4 w-4" />
            Send RTP timestamps
          </Button>
        </div>
      </section>
      <DataTracksSection />
      <DataPacketsSection outgoingTopicActivity={rtpTimestampActivity} />
    </div>
  );
}
