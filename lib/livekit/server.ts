import { RoomServiceClient, AccessToken } from "livekit-server-sdk";
import { envServer } from "@/lib/env/server";

export const roomService = new RoomServiceClient(
  envServer.LIVEKIT_API_URL,
  envServer.LIVEKIT_API_KEY,
  envServer.LIVEKIT_API_SECRET
);

export async function listRooms() {
  const rooms = await roomService.listRooms();
  return rooms.map((room) => ({
    name: room.name,
    numParticipants: room.numParticipants,
    maxParticipants: room.maxParticipants,
    creationTime: room.creationTime ? Number(room.creationTime) : undefined,
  }));
}

export async function createToken(
  roomName: string,
  participantName: string
): Promise<string> {
  const token = new AccessToken(
    envServer.LIVEKIT_API_KEY,
    envServer.LIVEKIT_API_SECRET,
    {
      identity: participantName,
      name: participantName,
    }
  );

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canSubscribe: true,
    canPublish: false, // Viewer only - no publishing
    canPublishData: false,
  });

  return await token.toJwt();
}
