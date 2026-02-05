"use client";

import { useState, useEffect, useCallback } from "react";
import { RoomCard } from "@/components/room-card";
import { CredentialsForm } from "@/components/credentials-form";
import { Button } from "@/components/ui/button";
import { RefreshCw, Video, LogOut } from "lucide-react";
import { useCredentials } from "@/lib/credentials/context";

interface Room {
  name: string;
  numParticipants: number;
  maxParticipants?: number;
  creationTime?: number;
}

export default function Home() {
  const {
    credentials,
    isLoading: isLoadingCredentials,
    clearCredentials,
  } = useCredentials();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    if (!credentials) return;

    setIsLoadingRooms(true);
    setError(null);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch rooms");
      }

      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch rooms");
    } finally {
      setIsLoadingRooms(false);
    }
  }, [credentials]);

  // Fetch rooms when credentials are available
  useEffect(() => {
    if (credentials) {
      fetchRooms();
    }
  }, [credentials, fetchRooms]);

  // Show loading while checking for stored credentials
  if (isLoadingCredentials) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  // Show credentials form if not configured
  if (!credentials) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Video className="h-10 w-10 text-blue-500" />
            <h1 className="text-3xl font-bold">LiveKit Monitoring Dashboard</h1>
          </div>
          <p className="max-w-md text-neutral-400">
            Connect to your LiveKit server to view and monitor active rooms
          </p>
        </div>
        <CredentialsForm />
      </div>
    );
  }

  // Show dashboard with rooms
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <Video className="h-8 w-8 text-blue-500" />
                <h1 className="text-3xl font-bold">
                  LiveKit Monitoring Dashboard
                </h1>
              </div>
              <p className="text-neutral-400">
                Connected to{" "}
                <span className="font-mono text-sm text-neutral-300">
                  {credentials.url}
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCredentials}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </header>

        {/* Rooms Section */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Available Rooms</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRooms}
              disabled={isLoadingRooms}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoadingRooms ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {isLoadingRooms ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-800 py-16 text-center">
              <Video className="mx-auto mb-4 h-12 w-12 text-neutral-600" />
              <h3 className="mb-2 text-lg font-medium">No Active Rooms</h3>
              <p className="text-neutral-400">
                There are no LiveKit rooms available at the moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard
                  key={room.name}
                  name={room.name}
                  numParticipants={room.numParticipants}
                  maxParticipants={room.maxParticipants}
                  creationTime={room.creationTime}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
