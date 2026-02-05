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
  const { credentials, isLoading: isLoadingCredentials, clearCredentials } = useCredentials();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Show credentials form if not configured
  if (!credentials) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Video className="h-10 w-10 text-blue-500" />
            <h1 className="text-3xl font-bold">LiveKit Monitoring Dashboard</h1>
          </div>
          <p className="text-neutral-400 max-w-md">
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Video className="h-8 w-8 text-blue-500" />
                <h1 className="text-3xl font-bold">LiveKit Monitoring Dashboard</h1>
              </div>
              <p className="text-neutral-400">
                Connected to{" "}
                <span className="text-neutral-300 font-mono text-sm">
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Available Rooms</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRooms}
              disabled={isLoadingRooms}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRooms ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {isLoadingRooms ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-neutral-800 rounded-lg">
              <Video className="h-12 w-12 mx-auto mb-4 text-neutral-600" />
              <h3 className="text-lg font-medium mb-2">No Active Rooms</h3>
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
