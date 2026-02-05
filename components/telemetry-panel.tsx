"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useDataChannel } from "@livekit/components-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Clock, Zap } from "lucide-react";

interface TelemetryMessage {
  id: string;
  timestamp: number;
  data: string;
  size: number;
}

interface TelemetryStats {
  messageCount: number;
  currentRate: number; // Hz
  averageSize: number; // bytes
  lastReceived: number | null;
}

const TELEMETRY_CHANNEL = "telemetry";
const MAX_MESSAGES = 50; // Keep last 50 messages
const RATE_WINDOW_MS = 5000; // Calculate rate over 5 second window

export function TelemetryPanel() {
  const [messages, setMessages] = useState<TelemetryMessage[]>([]);
  const [stats, setStats] = useState<TelemetryStats>({
    messageCount: 0,
    currentRate: 0,
    averageSize: 0,
    lastReceived: null,
  });

  const messageTimestamps = useRef<number[]>([]);
  const messageSizes = useRef<number[]>([]);

  const calculateRate = useCallback(() => {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW_MS;

    // Filter timestamps within the window
    messageTimestamps.current = messageTimestamps.current.filter(
      (ts) => ts > windowStart
    );

    // Calculate rate (messages per second)
    const rate = messageTimestamps.current.length / (RATE_WINDOW_MS / 1000);

    return rate;
  }, []);

  const onMessage = useCallback((payload: Uint8Array) => {
    const now = Date.now();
    const decoder = new TextDecoder();
    const dataString = decoder.decode(payload);
    const size = payload.byteLength;

    // Add to timestamps for rate calculation
    messageTimestamps.current.push(now);
    messageSizes.current.push(size);

    // Keep only recent sizes for average calculation
    if (messageSizes.current.length > 100) {
      messageSizes.current = messageSizes.current.slice(-100);
    }

    const newMessage: TelemetryMessage = {
      id: `${now}-${Math.random().toString(36).substring(7)}`,
      timestamp: now,
      data: dataString,
      size,
    };

    setMessages((prev) => {
      const updated = [newMessage, ...prev];
      return updated.slice(0, MAX_MESSAGES);
    });

    // Update stats
    const currentRate = calculateRate();
    const averageSize =
      messageSizes.current.length > 0
        ? messageSizes.current.reduce((a, b) => a + b, 0) /
        messageSizes.current.length
        : 0;

    setStats((prev) => ({
      messageCount: prev.messageCount + 1,
      currentRate,
      averageSize,
      lastReceived: now,
    }));
  }, [calculateRate]);

  // Subscribe to the telemetry data channel
  useDataChannel(TELEMETRY_CHANNEL, (msg) => {
    onMessage(msg.payload as Uint8Array);
  });

  // Update rate periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const rate = calculateRate();
      setStats((prev) => ({ ...prev, currentRate: rate }));
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRate]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-400 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs">Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.currentRate.toFixed(1)}
              <span className="text-sm font-normal text-neutral-400 ml-1">
                Hz
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-400 mb-1">
              <Database className="h-4 w-4" />
              <span className="text-xs">Avg Size</span>
            </div>
            <div className="text-2xl font-bold">
              {formatSize(stats.averageSize)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-400 mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs">Total Messages</span>
            </div>
            <div className="text-2xl font-bold">{stats.messageCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Last Received</span>
            </div>
            <div className="text-sm font-medium">
              {stats.lastReceived
                ? formatTime(stats.lastReceived)
                : "No data yet"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages Stream */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Message Stream
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {TELEMETRY_CHANNEL}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto space-y-2 font-mono text-xs">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                <Activity className="h-8 w-8 mb-2" />
                <p>Waiting for telemetry data...</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-2 bg-neutral-800 rounded border border-neutral-700"
                >
                  <div className="flex items-center justify-between mb-1 text-neutral-400">
                    <span>{formatTime(msg.timestamp)}</span>
                    <span>{formatSize(msg.size)}</span>
                  </div>
                  <pre className="text-neutral-200 whitespace-pre-wrap break-all overflow-hidden">
                    {msg.data.length > 500
                      ? `${msg.data.substring(0, 500)}...`
                      : msg.data}
                  </pre>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
