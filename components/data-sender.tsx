"use client";

import { useState, useRef, useCallback } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Square, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function DataSender() {
  const room = useRoomContext();
  const [topic, setTopic] = useState("");
  const [payload, setPayload] = useState('{\n  "message": "Hello World"\n}');
  const [frequency, setFrequency] = useState(0);
  const [reliable, setReliable] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messagesSent, setMessagesSent] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const validateJson = useCallback(
    (text: string): { valid: boolean; error?: string } => {
      if (!text.trim()) {
        return { valid: false, error: "Payload cannot be empty" };
      }
      try {
        JSON.parse(text);
        return { valid: true };
      } catch {
        return { valid: false, error: "Invalid JSON" };
      }
    },
    [],
  );

  const jsonValidation = validateJson(payload);

  const sendMessage = useCallback(async () => {
    if (!topic.trim()) {
      setLastError("Topic is required");
      return;
    }

    if (!jsonValidation.valid) {
      setLastError(jsonValidation.error || "Invalid JSON");
      return;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);

      await room.localParticipant.publishData(data, {
        topic: topic.trim(),
        reliable,
      });

      setMessagesSent((prev) => prev + 1);
      setLastError(null);
    } catch {
      setLastError("Failed to send message");
    }
  }, [room, topic, payload, reliable, jsonValidation]);

  const startSending = useCallback(() => {
    if (!topic.trim()) {
      setLastError("Topic is required");
      return;
    }

    if (!jsonValidation.valid) {
      setLastError(jsonValidation.error || "Invalid JSON");
      return;
    }

    setIsSending(true);
    setMessagesSent(0);
    setLastError(null);

    sendMessage();

    if (frequency > 0) {
      intervalRef.current = setInterval(() => {
        sendMessage();
      }, 1000 / frequency);
    }
  }, [topic, frequency, jsonValidation, sendMessage]);

  const stopSending = useCallback(() => {
    setIsSending(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return (
    <Card className="border-neutral-800 bg-neutral-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Data Sender</CardTitle>
          {isSending && (
            <Badge variant="success" className="animate-pulse">
              Sending...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Topic</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., control"
              disabled={isSending}
              className="border-neutral-700 bg-neutral-800 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Frequency (Hz)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value) || 0)}
              disabled={isSending}
              className="border-neutral-700 bg-neutral-800 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-neutral-400">JSON Payload</Label>
            <div className="flex items-center gap-1">
              {jsonValidation.valid ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span
                className={cn(
                  "text-xs",
                  jsonValidation.valid ? "text-green-500" : "text-red-500",
                )}
              >
                {jsonValidation.valid ? "Valid JSON" : jsonValidation.error}
              </span>
            </div>
          </div>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            disabled={isSending}
            rows={5}
            className="w-full resize-none rounded-md border border-neutral-700 bg-neutral-800 p-2 font-mono text-xs text-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
            placeholder='{"key": "value"}'
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Delivery:</span>
            <button
              onClick={() => setReliable(true)}
              disabled={isSending}
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                reliable
                  ? "bg-green-600 text-white"
                  : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600",
              )}
            >
              Reliable
            </button>
            <button
              onClick={() => setReliable(false)}
              disabled={isSending}
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                !reliable
                  ? "bg-yellow-600 text-white"
                  : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600",
              )}
            >
              Lossy
            </button>
          </div>

          {isSending ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={stopSending}
              className="gap-1"
            >
              <Square className="h-3 w-3" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={startSending}
              disabled={!topic.trim() || !jsonValidation.valid}
              className="gap-1"
            >
              <Send className="h-3 w-3" />
              {frequency > 0 ? "Start" : "Send"}
            </Button>
          )}
        </div>

        {lastError && (
          <div className="rounded border border-red-800 bg-red-900/20 p-2 text-xs text-red-400">
            {lastError}
          </div>
        )}

        {messagesSent > 0 && (
          <div className="text-xs text-neutral-400">
            Messages sent:{" "}
            <span className="font-medium text-neutral-200">{messagesSent}</span>
            {frequency > 0 && isSending && (
              <span className="ml-2">at {frequency} Hz</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
