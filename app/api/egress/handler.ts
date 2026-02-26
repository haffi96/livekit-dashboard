import { Hono } from "hono";
import { z } from "zod";
import {
  startRoomCompositeSegmentEgress,
  stopEgress,
  listEgress,
  isGcsConfigured,
} from "@/lib/livekit/egress";

export const egressRouter = new Hono();

const StartSchema = z.object({
  roomName: z.string().min(1),
});

const StopSchema = z.object({
  egressId: z.string().min(1),
});

// POST /api/egress/start - Start HLS segment recording
egressRouter.post("/start", async (c) => {
  try {
    if (!isGcsConfigured()) {
      return c.json(
        { error: "GCS not configured. Set GCS_BUCKET and GCS_CREDENTIALS." },
        400,
      );
    }

    const json = await c.req.json();
    const { roomName } = StartSchema.parse(json);
    const info = await startRoomCompositeSegmentEgress(roomName);

    return c.json({
      egressId: info.egressId,
      status: info.status,
      roomName: info.roomName,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.issues[0]?.message }, 400);
    }
    console.error("Error starting egress:", error);
    const message =
      error instanceof Error ? error.message : "Failed to start recording";
    return c.json({ error: message }, 500);
  }
});

// POST /api/egress/stop - Stop a recording
egressRouter.post("/stop", async (c) => {
  try {
    const json = await c.req.json();
    const { egressId } = StopSchema.parse(json);
    const info = await stopEgress(egressId);

    return c.json({
      egressId: info.egressId,
      status: info.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.issues[0]?.message }, 400);
    }
    console.error("Error stopping egress:", error);
    const message =
      error instanceof Error ? error.message : "Failed to stop recording";
    return c.json({ error: message }, 500);
  }
});

// POST /api/egress/list - List egress for a room
egressRouter.post("/list", async (c) => {
  try {
    const json = await c.req.json();
    const roomName = json.roomName as string | undefined;
    const items = await listEgress(roomName);

    return c.json({
      items: items.map((info) => ({
        egressId: info.egressId,
        status: info.status,
        roomName: info.roomName,
        startedAt: info.startedAt ? Number(info.startedAt) : undefined,
        endedAt: info.endedAt ? Number(info.endedAt) : undefined,
      })),
    });
  } catch (error) {
    console.error("Error listing egress:", error);
    const message =
      error instanceof Error ? error.message : "Failed to list recordings";
    return c.json({ error: message }, 500);
  }
});

// GET /api/egress/status - Check if GCS is configured
egressRouter.get("/status", async (c) => {
  return c.json({ gcsConfigured: isGcsConfigured() });
});
