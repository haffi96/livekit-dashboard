import { RoomView } from "@/components/room-view";

interface RoomPageProps {
  params: Promise<{
    roomName: string;
  }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomName } = await params;
  const decodedRoomName = decodeURIComponent(roomName);
  
  // Get the LiveKit URL from environment
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!livekitUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Configuration Error</h2>
          <p className="text-neutral-400">
            LiveKit URL is not configured. Please set NEXT_PUBLIC_LIVEKIT_URL environment variable.
          </p>
        </div>
      </div>
    );
  }

  return <RoomView roomName={decodedRoomName} livekitUrl={livekitUrl} />;
}

export async function generateMetadata({ params }: RoomPageProps) {
  const { roomName } = await params;
  return {
    title: `${decodeURIComponent(roomName)} - LiveKit Monitoring`,
  };
}
