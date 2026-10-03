"use client";

// livekit-client 2.20 renamed "packet trailer" to "frame metadata"; the worker
// entry point moved with it. The data on the wire is unchanged.
export function createFrameMetadataWorker(): Worker | null {
  try {
    return new Worker(
      new URL("livekit-client/frame-metadata-worker", import.meta.url),
      { type: "module" },
    );
  } catch (error) {
    console.warn("Frame metadata worker unavailable", error);
    return null;
  }
}
