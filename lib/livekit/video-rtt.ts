"use client";

import type { Room } from "livekit-client";
import type { VideoFrameMetric } from "@/lib/video-frame-metrics-store";

export const VIDEO_RTT_TOPIC = "rtp.timestamp";

export async function publishVideoRttMetric(
  room: Room,
  metric: VideoFrameMetric,
): Promise<number> {
  const sentAtMs = Date.now();
  const payload = {
    type: "rtp.timestamp.frame",
    version: 1,
    sentAtMs,
    roomName: metric.roomName,
    subscriberIdentity: metric.subscriberIdentity,
    publisherIdentity: metric.publisherIdentity,
    trackSid: metric.trackSid,
    trackName: metric.trackName,
    rtpTimestamp: metric.rtpTimestamp,
    frameId: metric.frameId,
    publisherTimestampUs: metric.publisherTimestampUs,
    publisherTimestampMs: metric.publisherTimestampMs,
    receivedAtMs: metric.receivedAtMs,
    oneWayLatencyMs: metric.oneWayLatencyMs,
  };

  await room.localParticipant.publishData(
    new TextEncoder().encode(JSON.stringify(payload)),
    {
      topic: VIDEO_RTT_TOPIC,
      reliable: false,
    },
  );

  return sentAtMs;
}
