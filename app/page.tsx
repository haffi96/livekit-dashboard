import { RoomCard } from "@/components/room-card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Video } from "lucide-react";
import { listRooms } from "@/lib/livekit/server";

export const dynamic = "force-dynamic";

interface Room {
  name: string;
  numParticipants: number;
  maxParticipants?: number;
  creationTime?: number;
}

async function getRooms(): Promise<Room[]> {
  try {
    const rooms = await listRooms();
    return rooms;
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return [];
  }
}

export default async function Home() {
  const rooms = await getRooms();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Video className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold">LiveKit Monitoring Dashboard</h1>
          </div>
          <p className="text-neutral-400">
            View and connect to active LiveKit rooms
          </p>
        </header>

        {/* Rooms Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Available Rooms</h2>
            <form>
              <Button variant="outline" size="sm" type="submit">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </form>
          </div>

          {rooms.length === 0 ? (
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
