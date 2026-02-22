"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, DataPacket_Kind, RemoteParticipant } from "livekit-client";
import {
  decodePayloadByMode,
  type SerializationMode,
} from "@/lib/data-serialization";

export interface TopicMessage {
  id: string;
  timestamp: number;
  data: string;
  size: number;
  participantIdentity: string;
  kind: DataPacket_Kind;
}

export interface TopicStats {
  messageCount: number;
  currentRate: number;
  averageSize: number;
  lastReceived: number | null;
  lastKind: DataPacket_Kind | null;
}

interface TopicData {
  messages: TopicMessage[];
  stats: TopicStats;
}
export interface IncomingTopicActivity {
  topic: string;
  stats: TopicStats;
}

const MAX_MESSAGES_PER_TOPIC = 50;
const RATE_WINDOW_MS = 5000;
const MAX_RATE_SAMPLES_PER_TOPIC = 5000;
const MAX_SIZE_SAMPLES_PER_TOPIC = 100;

export function useDataTopics(receiverMode: SerializationMode) {
  const room = useRoomContext();
  const [topics, setTopics] = useState<Map<string, TopicData>>(new Map());
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const messageTimestampsRef = useRef<Map<string, number[]>>(new Map());
  const messageSizesRef = useRef<Map<string, number[]>>(new Map());

  const calculateRate = useCallback((topic: string) => {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW_MS;
    const timestamps = messageTimestampsRef.current.get(topic) || [];

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

    if (timestamps.length > MAX_RATE_SAMPLES_PER_TOPIC) {
      timestamps.splice(0, timestamps.length - MAX_RATE_SAMPLES_PER_TOPIC);
    }

    messageTimestampsRef.current.set(topic, timestamps);

    return timestamps.length / (RATE_WINDOW_MS / 1000);
  }, []);

  const handleMessage = useCallback(
    (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      kind?: DataPacket_Kind,
      topic?: string,
    ) => {
      void (async () => {
      const topicName = topic || "default";
      const now = Date.now();
      let dataString = "";
      try {
        dataString = await decodePayloadByMode(payload, receiverMode);
      } catch (error) {
        dataString = `[decode error: ${receiverMode}] ${
          error instanceof Error ? error.message : "Failed to decode payload"
        }`;
      }
      const size = payload.byteLength;

      const timestamps = messageTimestampsRef.current.get(topicName) || [];
      timestamps.push(now);

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
      if (timestamps.length > MAX_RATE_SAMPLES_PER_TOPIC) {
        timestamps.splice(0, timestamps.length - MAX_RATE_SAMPLES_PER_TOPIC);
      }
      messageTimestampsRef.current.set(topicName, timestamps);

      const sizes = messageSizesRef.current.get(topicName) || [];
      sizes.push(size);
      if (sizes.length > MAX_SIZE_SAMPLES_PER_TOPIC) {
        sizes.splice(0, sizes.length - MAX_SIZE_SAMPLES_PER_TOPIC);
      }
      messageSizesRef.current.set(topicName, sizes);

      const newMessage: TopicMessage = {
        id: `${now}-${Math.random().toString(36).substring(7)}`,
        timestamp: now,
        data: dataString,
        size,
        participantIdentity: participant?.identity || "unknown",
        kind: kind ?? DataPacket_Kind.RELIABLE,
      };

      const currentRate = timestamps.length / (RATE_WINDOW_MS / 1000);
      const averageSize =
        sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;

      setTopics((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(topicName);
        const messages = existing
          ? [newMessage, ...existing.messages].slice(0, MAX_MESSAGES_PER_TOPIC)
          : [newMessage];
        const prevCount = existing?.stats.messageCount || 0;

        newMap.set(topicName, {
          messages,
          stats: {
            messageCount: prevCount + 1,
            currentRate,
            averageSize,
            lastReceived: now,
            lastKind: kind ?? null,
          },
        });
        return newMap;
      });
      })();
    },
    [receiverMode],
  );

  useEffect(() => {
    if (!room) return;

    room.on(RoomEvent.DataReceived, handleMessage);

    return () => {
      room.off(RoomEvent.DataReceived, handleMessage);
    };
  }, [room, handleMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTopics((prev) => {
        const newMap = new Map(prev);
        let changed = false;

        for (const [topic, data] of newMap) {
          const newRate = calculateRate(topic);
          if (data.stats.currentRate !== newRate) {
            newMap.set(topic, {
              ...data,
              stats: { ...data.stats, currentRate: newRate },
            });
            changed = true;
          }
        }

        return changed ? newMap : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRate]);

  const getTopicMessages = useCallback(
    (topic: string): TopicMessage[] => {
      return topics.get(topic)?.messages || [];
    },
    [topics],
  );

  const getTopicStats = useCallback(
    (topic: string): TopicStats => {
      return (
        topics.get(topic)?.stats || {
          messageCount: 0,
          currentRate: 0,
          averageSize: 0,
          lastReceived: null,
          lastKind: null,
        }
      );
    },
    [topics],
  );

  const topicList = Array.from(topics.keys()).sort();
  const incomingTopicActivity: IncomingTopicActivity[] = topicList.map(
    (topic) => ({
      topic,
      stats: topics.get(topic)?.stats ?? {
        messageCount: 0,
        currentRate: 0,
        averageSize: 0,
        lastReceived: null,
        lastKind: null,
      },
    }),
  );

  return {
    topics: topicList,
    incomingTopicActivity,
    selectedTopic,
    setSelectedTopic,
    getTopicMessages,
    getTopicStats,
    hasData: topics.size > 0,
  };
}
