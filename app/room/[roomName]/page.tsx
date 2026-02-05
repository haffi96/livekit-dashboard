"use client";

import { use } from "react";
import { RoomView } from "@/components/room-view";

interface RoomPageProps {
  params: Promise<{
    roomName: string;
  }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomName } = use(params);
  const decodedRoomName = decodeURIComponent(roomName);

  return <RoomView roomName={decodedRoomName} />;
}
