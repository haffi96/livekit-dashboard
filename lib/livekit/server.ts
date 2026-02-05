import { RoomServiceClient, AccessToken } from "livekit-server-sdk";

// Helper to convert WebSocket URL to HTTP URL for RoomServiceClient
function toHttpUrl(url: string): string {
  // RoomServiceClient needs http(s) URL, not ws(s)
  // Handle all cases: wss://, ws://, https://, http://
  if (url.startsWith("wss://")) {
    return url.replace(/^wss:\/\//, "https://");
  }
  if (url.startsWith("ws://")) {
    return url.replace(/^ws:\/\//, "http://");
  }
  // Already http(s), return as-is
  return url;
}

export async function listRoomsWithCredentials(
  url: string,
  apiKey: string,
  apiSecret: string
) {
  const httpUrl = toHttpUrl(url);
  const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
  const rooms = await roomService.listRooms();

  return rooms.map((room) => ({
    name: room.name,
    numParticipants: room.numParticipants,
    maxParticipants: room.maxParticipants,
    creationTime: room.creationTime ? Number(room.creationTime) : undefined,
  }));
}

export async function createTokenWithCredentials(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantName: string
): Promise<string> {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    name: participantName,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canSubscribe: true,
    canPublish: false, // Viewer only - no publishing
    canPublishData: false,
  });

  return await token.toJwt();
}
