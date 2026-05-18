"use client";

export function createPacketTrailerWorker(): Worker | null {
  try {
    return new Worker(
      new URL("livekit-client/packet-trailer-worker", import.meta.url),
      { type: "module" },
    );
  } catch (error) {
    console.warn("Packet trailer worker unavailable", error);
    return null;
  }
}
