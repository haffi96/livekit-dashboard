"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Key, Link, Lock } from "lucide-react";
import {
  useCredentials,
  type LiveKitCredentials,
} from "@/lib/credentials/context";

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

    // Validate and store credentials via API (credentials stored in encrypted cookie)
    try {
      await setCredentials(credentials);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
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
        {/* Security Info */}
        <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <div className="text-sm">
              <p className="mb-1 font-medium text-green-500">
                Encrypted Storage
              </p>
              <p className="text-neutral-400">
                Your credentials are encrypted and stored in a secure HTTP-only
                cookie. Livekit secrets are never exposed to client-side
                JavaScript or anywhere else.
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
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Connecting..." : "Connect"}
          </Button>
        </form>

        <div className="mt-4 border-t border-neutral-800 pt-4">
          <p className="text-center text-xs text-neutral-500">
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
