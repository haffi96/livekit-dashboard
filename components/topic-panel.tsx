"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Clock, Zap, User } from "lucide-react";
import { TopicMessage, TopicStats } from "@/hooks/use-data-topics";
import { DataPacket_Kind } from "livekit-client";
import { cn } from "@/lib/utils";

interface TopicPanelProps {
  topic: string;
  messages: TopicMessage[];
  stats: TopicStats;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatKind(kind: DataPacket_Kind | null) {
  if (kind === null || kind === undefined) return "unknown";
  return kind === DataPacket_Kind.RELIABLE ? "reliable" : "lossy";
}

export function TopicPanel({ topic, messages, stats }: TopicPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-neutral-400">
              <Zap className="h-4 w-4" />
              <span className="text-xs">Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.currentRate.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-neutral-400">
                Hz
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-neutral-400">
              <Database className="h-4 w-4" />
              <span className="text-xs">Avg Size</span>
            </div>
            <div className="text-2xl font-bold">
              {formatSize(stats.averageSize)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-neutral-400">
              <Activity className="h-4 w-4" />
              <span className="text-xs">Total Messages</span>
            </div>
            <div className="text-2xl font-bold">{stats.messageCount}</div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-neutral-400">
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

      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Message Stream
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {topic}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 space-y-2 overflow-y-auto font-mono text-xs">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-neutral-500">
                <Activity className="mb-2 h-8 w-8" />
                <p>Waiting for data on this topic...</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded border border-neutral-700 bg-neutral-800 p-2"
                >
                  <div className="mb-1 flex items-center justify-between text-neutral-400">
                    <div className="flex items-center gap-2">
                      <span>{formatTime(msg.timestamp)}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          msg.kind === DataPacket_Kind.RELIABLE
                            ? "border-green-600 text-green-400"
                            : "border-yellow-600 text-yellow-400",
                        )}
                      >
                        {formatKind(msg.kind)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {msg.participantIdentity}
                      </span>
                      <span>{formatSize(msg.size)}</span>
                    </div>
                  </div>
                  <pre className="overflow-hidden break-all whitespace-pre-wrap text-neutral-200">
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
