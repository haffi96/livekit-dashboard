"use client";

import { useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import {
  VIDEO_RTT_TOPIC,
  publishVideoRttMetric,
} from "@/lib/livekit/video-rtt";
import {
  subscribeVideoFrameMetricEvents,
  type VideoFrameMetric,
} from "@/lib/video-frame-metrics-store";

export function useVideoRttPublisher(
  enabled: boolean,
  onPublishSuccess?: (topic: string, timestamp: number) => void,
) {
  const room = useRoomContext();
  const lastSentMetricIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const sendMetric = (metric: VideoFrameMetric) => {
      if (lastSentMetricIdRef.current === metric.id) {
        return;
      }
      lastSentMetricIdRef.current = metric.id;
      void publishVideoRttMetric(room, metric)
        .then((timestamp) => {
          onPublishSuccess?.(VIDEO_RTT_TOPIC, timestamp);
        })
        .catch((error) => {
          console.error("Failed to publish video RTT metric", error);
        });
    };

    return subscribeVideoFrameMetricEvents(sendMetric);
  }, [enabled, onPublishSuccess, room]);
}
