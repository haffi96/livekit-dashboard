"use client";

import { useSyncExternalStore } from "react";

export interface VideoFrameMetric {
  id: string;
  roomName: string;
  subscriberIdentity: string;
  publisherIdentity: string;
  trackSid: string;
  trackName: string;
  rtpTimestamp: number;
  frameId: number | null;
  publisherTimestampUs: string | null;
  publisherTimestampMs: number | null;
  receivedAtMs: number;
  oneWayLatencyMs: number | null;
}

export interface VideoFrameMetricsSnapshot {
  metricsByTrack: Map<string, VideoFrameMetric[]>;
  latestByTrack: Map<string, VideoFrameMetric>;
  version: number;
}

const MAX_METRICS_PER_TRACK = 300;
const UI_NOTIFY_INTERVAL_MS = 250;

let sequence = 0;
let version = 0;
let snapshot: VideoFrameMetricsSnapshot = {
  metricsByTrack: new Map(),
  latestByTrack: new Map(),
  version,
};

const uiListeners = new Set<() => void>();
const immediateListeners = new Set<(metric: VideoFrameMetric) => void>();
let uiNotifyTimer: ReturnType<typeof setTimeout> | null = null;

function notifyUiListeners() {
  uiNotifyTimer = null;
  for (const listener of uiListeners) {
    listener();
  }
}

function scheduleUiNotify() {
  if (uiNotifyTimer !== null) {
    return;
  }
  uiNotifyTimer = setTimeout(notifyUiListeners, UI_NOTIFY_INTERVAL_MS);
}

export function addVideoFrameMetric(
  metric: Omit<VideoFrameMetric, "id"> & { id?: string },
): VideoFrameMetric {
  sequence += 1;
  version += 1;

  const nextMetric: VideoFrameMetric = {
    ...metric,
    id: metric.id ?? String(sequence),
  };

  const metricsByTrack = new Map(snapshot.metricsByTrack);
  const existingMetrics = metricsByTrack.get(nextMetric.trackSid) ?? [];
  metricsByTrack.set(
    nextMetric.trackSid,
    [nextMetric, ...existingMetrics].slice(0, MAX_METRICS_PER_TRACK),
  );

  const latestByTrack = new Map(snapshot.latestByTrack);
  latestByTrack.set(nextMetric.trackSid, nextMetric);

  snapshot = {
    metricsByTrack,
    latestByTrack,
    version,
  };

  for (const listener of immediateListeners) {
    listener(nextMetric);
  }
  scheduleUiNotify();

  return nextMetric;
}

export function getVideoFrameMetricsSnapshot(): VideoFrameMetricsSnapshot {
  return snapshot;
}

export function subscribeVideoFrameMetrics(listener: () => void): () => void {
  uiListeners.add(listener);
  return () => {
    uiListeners.delete(listener);
  };
}

export function subscribeVideoFrameMetricEvents(
  listener: (metric: VideoFrameMetric) => void,
): () => void {
  immediateListeners.add(listener);
  return () => {
    immediateListeners.delete(listener);
  };
}

export function clearVideoFrameMetrics(trackSid?: string): void {
  version += 1;

  if (trackSid) {
    const metricsByTrack = new Map(snapshot.metricsByTrack);
    const latestByTrack = new Map(snapshot.latestByTrack);
    metricsByTrack.delete(trackSid);
    latestByTrack.delete(trackSid);
    snapshot = {
      metricsByTrack,
      latestByTrack,
      version,
    };
  } else {
    snapshot = {
      metricsByTrack: new Map(),
      latestByTrack: new Map(),
      version,
    };
  }

  scheduleUiNotify();
}

export function useVideoFrameMetrics(trackSid?: string): VideoFrameMetric[] {
  const metricsSnapshot = useSyncExternalStore(
    subscribeVideoFrameMetrics,
    getVideoFrameMetricsSnapshot,
    getVideoFrameMetricsSnapshot,
  );

  if (trackSid) {
    return metricsSnapshot.metricsByTrack.get(trackSid) ?? [];
  }

  return Array.from(metricsSnapshot.metricsByTrack.values()).flat();
}
