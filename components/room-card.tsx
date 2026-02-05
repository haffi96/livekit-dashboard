"use client";

import Link from "next/link";
import { Users, Clock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RoomCardProps {
  name: string;
  numParticipants: number;
  maxParticipants?: number;
  creationTime?: number;
}

export function RoomCard({
  name,
  numParticipants,
  maxParticipants,
  creationTime,
}: RoomCardProps) {
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <Card className="transition-colors hover:border-neutral-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge variant="success">Live</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-400">
          <Users className="h-4 w-4" />
          <span className="text-sm">
            {numParticipants} participant{numParticipants !== 1 ? "s" : ""}
            {maxParticipants ? ` / ${maxParticipants} max` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 text-neutral-400">
          <Clock className="h-4 w-4" />
          <span className="text-sm">Started: {formatTime(creationTime)}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/room/${encodeURIComponent(name)}`} className="w-full">
          <Button className="w-full">Join Room</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
