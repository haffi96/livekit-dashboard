"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import {
  type LocalDataTrack,
  type RemoteDataTrack,
  RoomEvent,
} from "livekit-client";
import {
  buildMessageEnvelope,
  decodePayloadByMode,
  encodePayloadByMode,
  type SerializationMode,
} from "@/lib/data-serialization";
import { normalizeEpochTimestampMs } from "@/lib/data-display";

export type DataTrackSubscriptionState =
  | "auto-subscribing"
  | "subscribed"
  | "paused"
  | "ended"
  | "error";

export interface DataTrackFrameMessage {
  id: string;
  trackSid: string;
  trackName: string;
  publisherIdentity: string;
  timestamp: number;
  userTimestamp: string | null;
  latencyMs: number | null;
  decodedData: string;
  decodeState: "ok" | "error";
  rawPreview: string;
  size: number;
}

export interface DataTrackStats {
  frameCount: number;
  currentRate: number;
  averageSize: number;
  lastReceived: number | null;
  lastLatencyMs: number | null;
  lastUserTimestamp: string | null;
}

export interface RemoteDataTrackEntry {
  id: string;
  sid: string;
  name: string;
  publisherIdentity: string;
  isPublished: boolean;
  subscriptionState: DataTrackSubscriptionState;
  lastError: string | null;
  stats: DataTrackStats;
}

export interface LocalDataTrackEntry {
  sid: string;
  name: string;
  framesSent: number;
  lastSent: number | null;
  lastError: string | null;
}

interface RemoteTrackData {
  entry: RemoteDataTrackEntry;
  frames: DataTrackFrameMessage[];
}

interface LocalTrackData {
  entry: LocalDataTrackEntry;
  track: LocalDataTrack;
}

const MAX_FRAMES_PER_TRACK = 50;
const RATE_WINDOW_MS = 5000;
const MAX_RATE_SAMPLES_PER_TRACK = 5000;
const MAX_SIZE_SAMPLES_PER_TRACK = 100;

function createEmptyStats(): DataTrackStats {
  return {
    frameCount: 0,
    currentRate: 0,
    averageSize: 0,
    lastReceived: null,
    lastLatencyMs: null,
    lastUserTimestamp: null,
  };
}

function buildRawPreview(payload: Uint8Array) {
  const preview = Array.from(payload.slice(0, 16))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join(" ");
  return payload.length > 16 ? `${preview} ...` : preview;
}

function getRemoteTrackKey(track: RemoteDataTrack) {
  return track.info.sid;
}

export function useDataTracks(receiverMode: SerializationMode) {
  const room = useRoomContext();
  const [remoteTracks, setRemoteTracks] = useState<Map<string, RemoteTrackData>>(
    new Map(),
  );
  const [localTracks, setLocalTracks] = useState<Map<string, LocalTrackData>>(
    new Map(),
  );

  const receiverModeRef = useRef(receiverMode);
  const remoteTrackRefs = useRef<Map<string, RemoteDataTrack>>(new Map());
  const localTrackRefs = useRef<Map<string, LocalDataTrack>>(new Map());
  const subscriptionsRef = useRef<Map<string, AbortController>>(new Map());
  const frameTimestampsRef = useRef<Map<string, number[]>>(new Map());
  const frameSizesRef = useRef<Map<string, number[]>>(new Map());
  const sequenceByTrackRef = useRef<Map<string, number>>(new Map());

  receiverModeRef.current = receiverMode;

  const calculateRate = useCallback((trackSid: string) => {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW_MS;
    const timestamps = frameTimestampsRef.current.get(trackSid) || [];

    let staleCount = 0;
    while (
      staleCount < timestamps.length &&
      timestamps[staleCount] <= windowStart
    ) {
      staleCount += 1;
    }

    if (staleCount > 0) {
      timestamps.splice(0, staleCount);
    }

    if (timestamps.length > MAX_RATE_SAMPLES_PER_TRACK) {
      timestamps.splice(0, timestamps.length - MAX_RATE_SAMPLES_PER_TRACK);
    }

    frameTimestampsRef.current.set(trackSid, timestamps);
    return timestamps.length / (RATE_WINDOW_MS / 1000);
  }, []);

  const upsertRemoteTrack = useCallback((track: RemoteDataTrack) => {
    const sid = getRemoteTrackKey(track);
    remoteTrackRefs.current.set(sid, track);

    setRemoteTracks((prev) => {
      const next = new Map(prev);
      const existing = next.get(sid);
      const nextState: DataTrackSubscriptionState =
        existing?.entry.subscriptionState === "paused"
          ? "paused"
          : existing?.entry.subscriptionState === "subscribed"
            ? "subscribed"
            : "auto-subscribing";

      next.set(sid, {
        entry: {
          id: sid,
          sid,
          name: track.info.name,
          publisherIdentity: track.publisherIdentity,
          isPublished: true,
          subscriptionState: nextState,
          lastError: existing?.entry.lastError ?? null,
          stats: existing?.entry.stats ?? createEmptyStats(),
        },
        frames: existing?.frames ?? [],
      });

      return next;
    });
  }, []);

  const markRemoteTrack = useCallback(
    (
      sid: string,
      updater: (existing: RemoteTrackData) => RemoteTrackData,
    ): void => {
      setRemoteTracks((prev) => {
        const existing = prev.get(sid);
        if (!existing) {
          return prev;
        }

        const next = new Map(prev);
        next.set(sid, updater(existing));
        return next;
      });
    },
    [],
  );

  const stopSubscription = useCallback(
    (sid: string, nextState: DataTrackSubscriptionState) => {
      const controller = subscriptionsRef.current.get(sid);
      if (controller) {
        subscriptionsRef.current.delete(sid);
        controller.abort();
      }

      markRemoteTrack(sid, (existing) => ({
        ...existing,
        entry: {
          ...existing.entry,
          subscriptionState: nextState,
          lastError: nextState === "error" ? existing.entry.lastError : null,
        },
      }));
    },
    [markRemoteTrack],
  );

  const handleIncomingFrame = useCallback(async (track: RemoteDataTrack, frame: {
    payload: Uint8Array;
    userTimestamp?: bigint;
  }) => {
    const sid = getRemoteTrackKey(track);
    const now = Date.now();
    const size = frame.payload.byteLength;
    const timestamps = frameTimestampsRef.current.get(sid) || [];
    const sizes = frameSizesRef.current.get(sid) || [];

    timestamps.push(now);
    sizes.push(size);

    const windowStart = now - RATE_WINDOW_MS;
    let staleCount = 0;
    while (
      staleCount < timestamps.length &&
      timestamps[staleCount] <= windowStart
    ) {
      staleCount += 1;
    }
    if (staleCount > 0) {
      timestamps.splice(0, staleCount);
    }
    if (timestamps.length > MAX_RATE_SAMPLES_PER_TRACK) {
      timestamps.splice(0, timestamps.length - MAX_RATE_SAMPLES_PER_TRACK);
    }
    if (sizes.length > MAX_SIZE_SAMPLES_PER_TRACK) {
      sizes.splice(0, sizes.length - MAX_SIZE_SAMPLES_PER_TRACK);
    }

    frameTimestampsRef.current.set(sid, timestamps);
    frameSizesRef.current.set(sid, sizes);

    let decodedData = "";
    let decodeState: "ok" | "error" = "ok";

    try {
      decodedData = await decodePayloadByMode(
        frame.payload,
        receiverModeRef.current,
      );
    } catch (error) {
      decodeState = "error";
      decodedData = `[decode error: ${receiverModeRef.current}] ${
        error instanceof Error ? error.message : "Failed to decode payload"
      }`;
    }

    const userTimestamp = frame.userTimestamp?.toString() ?? null;
    const numericUserTimestamp =
      frame.userTimestamp !== undefined ? Number(frame.userTimestamp) : null;
    const normalizedUserTimestamp =
      numericUserTimestamp !== null
        ? normalizeEpochTimestampMs(numericUserTimestamp)
        : null;
    const latencyMs =
      normalizedUserTimestamp !== null ? now - normalizedUserTimestamp : null;

    const frameMessage: DataTrackFrameMessage = {
      id: `${sid}-${now}-${Math.random().toString(36).slice(2, 8)}`,
      trackSid: sid,
      trackName: track.info.name,
      publisherIdentity: track.publisherIdentity,
      timestamp: now,
      userTimestamp,
      latencyMs,
      decodedData,
      decodeState,
      rawPreview: buildRawPreview(frame.payload),
      size,
    };

    const currentRate = timestamps.length / (RATE_WINDOW_MS / 1000);
    const averageSize =
      sizes.length > 0
        ? sizes.reduce((total, value) => total + value, 0) / sizes.length
        : 0;

    markRemoteTrack(sid, (existing) => ({
      entry: {
        ...existing.entry,
        subscriptionState: "subscribed",
        lastError: null,
        stats: {
          frameCount: existing.entry.stats.frameCount + 1,
          currentRate,
          averageSize,
          lastReceived: now,
          lastLatencyMs:
            latencyMs !== null && Math.abs(latencyMs) < 60_000
              ? latencyMs
              : latencyMs,
          lastUserTimestamp: userTimestamp,
        },
      },
      frames: [frameMessage, ...existing.frames].slice(0, MAX_FRAMES_PER_TRACK),
    }));
  }, [markRemoteTrack]);

  const startSubscription = useCallback(
    (sid: string, mode: DataTrackSubscriptionState = "auto-subscribing") => {
      const track = remoteTrackRefs.current.get(sid);
      if (!track || subscriptionsRef.current.has(sid)) {
        return;
      }

      const controller = new AbortController();
      subscriptionsRef.current.set(sid, controller);

      markRemoteTrack(sid, (existing) => ({
        ...existing,
        entry: {
          ...existing.entry,
          subscriptionState: mode,
          lastError: null,
        },
      }));

      const stream = track.subscribe({ signal: controller.signal });
      const reader = stream.getReader();

      void (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            await handleIncomingFrame(track, value);
          }

          markRemoteTrack(sid, (existing) => ({
            ...existing,
            entry: {
              ...existing.entry,
              subscriptionState: existing.entry.isPublished ? "paused" : "ended",
            },
          }));
        } catch (error) {
          const aborted =
            controller.signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError");

          markRemoteTrack(sid, (existing) => ({
            ...existing,
            entry: {
              ...existing.entry,
              subscriptionState: aborted
                ? existing.entry.isPublished
                  ? "paused"
                  : "ended"
                : "error",
              lastError:
                aborted
                  ? null
                  : error instanceof Error
                    ? error.message
                    : "Track subscription failed",
            },
          }));
        } finally {
          if (subscriptionsRef.current.get(sid) === controller) {
            subscriptionsRef.current.delete(sid);
          }
          reader.releaseLock();
        }
      })();
    },
    [handleIncomingFrame, markRemoteTrack],
  );

  const resumeRemoteTrack = useCallback(
    (sid: string) => {
      startSubscription(sid, "auto-subscribing");
    },
    [startSubscription],
  );

  const pauseRemoteTrack = useCallback((sid: string) => {
    stopSubscription(sid, "paused");
  }, [stopSubscription]);

  const publishLocalTrack = useCallback(
    async (name: string) => {
      const trackName = name.trim();
      if (!trackName) {
        throw new Error("Track name is required");
      }
      if (!room?.localParticipant) {
        throw new Error("Not connected to room");
      }

      const track = await room.localParticipant.publishDataTrack({
        name: trackName,
      });

      if (!track.isPublished()) {
        throw new Error("Data track was not published");
      }

      const sid = track.info.sid;
      localTrackRefs.current.set(sid, track);

      setLocalTracks((prev) => {
        const next = new Map(prev);
        const existing = next.get(sid);
        next.set(sid, {
          track,
          entry: existing?.entry ?? {
            sid,
            name: track.info.name,
            framesSent: 0,
            lastSent: null,
            lastError: null,
          },
        });
        return next;
      });

      return sid;
    },
    [room],
  );

  const unpublishLocalTrack = useCallback(async (sid: string) => {
    const track = localTrackRefs.current.get(sid);
    if (!track) {
      throw new Error("Track is no longer available");
    }

    await track.unpublish();
    localTrackRefs.current.delete(sid);
    sequenceByTrackRef.current.delete(sid);

    setLocalTracks((prev) => {
      const next = new Map(prev);
      next.delete(sid);
      return next;
    });
  }, []);

  const pushFrameToTrack = useCallback(
    async ({
      sid,
      payloadText,
      senderMode,
      includeUserTimestamp,
    }: {
      sid: string;
      payloadText: string;
      senderMode: SerializationMode;
      includeUserTimestamp: boolean;
    }) => {
      const track = localTrackRefs.current.get(sid);
      if (!track) {
        throw new Error("Track is no longer available");
      }

      const sequence = sequenceByTrackRef.current.get(sid) ?? 0;
      const envelopeTimestamp = Date.now() * 1_000_000;
      const envelope = buildMessageEnvelope(
        payloadText,
        sequence,
        envelopeTimestamp,
      );
      const payload = await encodePayloadByMode(envelope, senderMode);

      await track.tryPush({
        payload,
        userTimestamp: includeUserTimestamp ? BigInt(Date.now()) : undefined,
      });

      sequenceByTrackRef.current.set(sid, sequence + 1);

      setLocalTracks((prev) => {
        const existing = prev.get(sid);
        if (!existing) {
          return prev;
        }

        const next = new Map(prev);
        next.set(sid, {
          ...existing,
          entry: {
            ...existing.entry,
            framesSent: existing.entry.framesSent + 1,
            lastSent: Date.now(),
            lastError: null,
          },
        });
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const subscriptions = subscriptionsRef.current;
    setRemoteTracks(new Map());
    setLocalTracks(new Map());
    remoteTrackRefs.current.clear();
    localTrackRefs.current.clear();
    subscriptions.forEach((controller) => controller.abort());
    subscriptions.clear();
    frameTimestampsRef.current.clear();
    frameSizesRef.current.clear();
    sequenceByTrackRef.current.clear();

    if (!room) {
      return;
    }

    const seedRemoteTracks = () => {
      for (const participant of room.remoteParticipants.values()) {
        for (const track of participant.dataTracks.values()) {
          upsertRemoteTrack(track);
          startSubscription(track.info.sid);
        }
      }
    };

    const handleRemoteTrackPublished = (track: RemoteDataTrack) => {
      upsertRemoteTrack(track);
      startSubscription(track.info.sid);
    };

    const handleParticipantChange = () => {
      seedRemoteTracks();
    };

    const handleRemoteTrackUnpublished = (sid: string) => {
      const controller = subscriptionsRef.current.get(sid);
      if (controller) {
        subscriptionsRef.current.delete(sid);
        controller.abort();
      }
      remoteTrackRefs.current.delete(sid);

      markRemoteTrack(sid, (existing) => ({
        ...existing,
        entry: {
          ...existing.entry,
          isPublished: false,
          subscriptionState: "ended",
          lastError: null,
        },
      }));
    };

    const handleLocalTrackPublished = (track: LocalDataTrack) => {
      if (!track.isPublished()) {
        return;
      }
      const sid = track.info.sid;
      localTrackRefs.current.set(sid, track);
      setLocalTracks((prev) => {
        const next = new Map(prev);
        const existing = next.get(sid);
        next.set(sid, {
          track,
          entry: existing?.entry ?? {
            sid,
            name: track.info.name,
            framesSent: 0,
            lastSent: null,
            lastError: null,
          },
        });
        return next;
      });
    };

    const handleLocalTrackUnpublished = (sid: string) => {
      localTrackRefs.current.delete(sid);
      sequenceByTrackRef.current.delete(sid);
      setLocalTracks((prev) => {
        const next = new Map(prev);
        next.delete(sid);
        return next;
      });
    };

    seedRemoteTracks();

    room.on(RoomEvent.DataTrackPublished, handleRemoteTrackPublished);
    room.on(RoomEvent.DataTrackUnpublished, handleRemoteTrackUnpublished);
    room.on(RoomEvent.LocalDataTrackPublished, handleLocalTrackPublished);
    room.on(RoomEvent.LocalDataTrackUnpublished, handleLocalTrackUnpublished);
    room.on(RoomEvent.ParticipantConnected, handleParticipantChange);
    room.on(RoomEvent.Reconnected, handleParticipantChange);

    return () => {
      subscriptions.forEach((controller) => controller.abort());
      subscriptions.clear();
      room.off(RoomEvent.DataTrackPublished, handleRemoteTrackPublished);
      room.off(RoomEvent.DataTrackUnpublished, handleRemoteTrackUnpublished);
      room.off(RoomEvent.LocalDataTrackPublished, handleLocalTrackPublished);
      room.off(
        RoomEvent.LocalDataTrackUnpublished,
        handleLocalTrackUnpublished,
      );
      room.off(RoomEvent.ParticipantConnected, handleParticipantChange);
      room.off(RoomEvent.Reconnected, handleParticipantChange);
    };
  }, [markRemoteTrack, room, startSubscription, upsertRemoteTrack]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteTracks((prev) => {
        const next = new Map(prev);
        let changed = false;

        for (const [sid, data] of next) {
          const currentRate = calculateRate(sid);
          if (data.entry.stats.currentRate !== currentRate) {
            next.set(sid, {
              ...data,
              entry: {
                ...data.entry,
                stats: {
                  ...data.entry.stats,
                  currentRate,
                },
              },
            });
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRate]);

  const remoteTrackList = useMemo(() => {
    return Array.from(remoteTracks.values())
      .map((value) => value.entry)
      .toSorted((a, b) => {
        if (a.isPublished !== b.isPublished) {
          return a.isPublished ? -1 : 1;
        }
        return (
          a.publisherIdentity.localeCompare(b.publisherIdentity) ||
          a.name.localeCompare(b.name)
        );
      });
  }, [remoteTracks]);

  const localTrackList = useMemo(() => {
    return Array.from(localTracks.values())
      .map((value) => value.entry)
      .toSorted((a, b) => a.name.localeCompare(b.name));
  }, [localTracks]);

  const getRemoteTrackFrames = useCallback(
    (sid: string) => {
      return remoteTracks.get(sid)?.frames ?? [];
    },
    [remoteTracks],
  );

  const getRemoteTrackEntry = useCallback(
    (sid: string) => {
      return remoteTracks.get(sid)?.entry ?? null;
    },
    [remoteTracks],
  );

  return {
    remoteTracks: remoteTrackList,
    localTracks: localTrackList,
    getRemoteTrackFrames,
    getRemoteTrackEntry,
    pauseRemoteTrack,
    resumeRemoteTrack,
    publishLocalTrack,
    unpublishLocalTrack,
    pushFrameToTrack,
    hasRemoteTracks: remoteTracks.size > 0,
  };
}
