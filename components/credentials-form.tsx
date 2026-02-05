"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Key, Link, Lock } from "lucide-react";
import { useCredentials, type LiveKitCredentials } from "@/lib/credentials/context";

interface CredentialsFormProps {
  onSuccess?: () => void;
}

export function CredentialsForm({ onSuccess }: CredentialsFormProps) {
  const { setCredentials } = useCredentials();
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Basic validation
    if (!url.trim()) {
      setError("LiveKit URL is required");
      setIsSubmitting(false);
      return;
    }

    if (!apiKey.trim()) {
      setError("API Key is required");
      setIsSubmitting(false);
      return;
    }

    if (!apiSecret.trim()) {
      setError("API Secret is required");
      setIsSubmitting(false);
      return;
    }

    // Normalize URL - ensure it has a valid scheme
    let normalizedUrl = url.trim();
    const hasScheme = /^(wss?|https?):\/\//.test(normalizedUrl);
    if (!hasScheme) {
      normalizedUrl = `wss://${normalizedUrl}`;
    }

    const credentials: LiveKitCredentials = {
      url: normalizedUrl,
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
    };

    // Test the credentials by trying to list rooms
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to connect to LiveKit server");
      }

      // Credentials are valid, save them
      setCredentials(credentials);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Connect to LiveKit
        </CardTitle>
        <CardDescription>
          Enter your LiveKit server credentials to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Security Warning */}
        <div className="mb-6 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-500 mb-1">Session Storage Only</p>
              <p className="text-neutral-400">
                Your credentials are stored in your browser session only and will be
                cleared when you close this tab. They are never sent to any external
                server except your own LiveKit server.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center gap-2">
              <Link className="h-3 w-3" />
              LiveKit URL
            </Label>
            <Input
              id="url"
              type="text"
              placeholder="wss://your-server.livekit.cloud"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-neutral-500">
              Your LiveKit server WebSocket URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <Key className="h-3 w-3" />
              API Key
            </Label>
            <Input
              id="apiKey"
              type="text"
              placeholder="APIxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiSecret" className="flex items-center gap-2">
              <Lock className="h-3 w-3" />
              API Secret
            </Label>
            <Input
              id="apiSecret"
              type="password"
              placeholder="Enter your API secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Connecting..." : "Connect"}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-neutral-800">
          <p className="text-xs text-neutral-500 text-center">
            Need credentials?{" "}
            <a
              href="https://cloud.livekit.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Get them from LiveKit Cloud
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
