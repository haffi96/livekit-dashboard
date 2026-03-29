import { Hono } from "hono";
import { z } from "zod";
import {
  getLatestRecordingSession,
  listEgress,
  listRecordingSessions,
  markRecordingSessionEnded,
  isGcsConfigured,
  startTrackSegmentEgresses,
  stopTrackEgresses,
} from "@/lib/livekit/egress";

export const egressRouter = new Hono();

const StartSchema = z.object({
  roomName: z.string().min(1),
  tracks: z
    .array(
      z.object({
        trackSid: z.string().min(1),
        participantIdentity: z.string().min(1),
        participantName: z.string().min(1),
        trackName: z.string().optional(),
        source: z.literal("camera"),
      }),
    )
    .min(1),
});

const StopSchema = z.object({
  roomName: z.string().min(1),
  sessionId: z.string().min(1),
  egressIds: z.array(z.string().min(1)).min(1),
});

const LatestSchema = z.object({
  roomName: z.string().min(1),
});

// POST /api/egress/start - Start per-track HLS recordings
egressRouter.post("/start", async (c) => {
  try {
    if (!isGcsConfigured()) {
      return c.json(
        { error: "GCS not configured. Set GCS_BUCKET and GCS_CREDENTIALS." },
        400,
      );
    }

    const json = await c.req.json();
    const { roomName, tracks } = StartSchema.parse(json);
    const session = await startTrackSegmentEgresses(roomName, tracks);

    return c.json({
      session,
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

// POST /api/egress/stop - Stop a recording session
egressRouter.post("/stop", async (c) => {
  try {
    const json = await c.req.json();
    const { roomName, sessionId, egressIds } = StopSchema.parse(json);
    const stopped = await stopTrackEgresses(egressIds);
    const session = await markRecordingSessionEnded(roomName, sessionId);

    return c.json({
      stoppedEgressIds: stopped.flatMap((result) =>
        result.status === "fulfilled" ? [result.value.egressId] : [],
      ),
      session,
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

// GET /api/egress/latest?roomName=abc - Load the latest recording session manifest
egressRouter.get("/latest", async (c) => {
  try {
    if (!isGcsConfigured()) {
      return c.json({ session: null });
    }

    const { roomName } = LatestSchema.parse({
      roomName: c.req.query("roomName"),
    });
    const session = await getLatestRecordingSession(roomName);

    return c.json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.issues[0]?.message }, 400);
    }
    console.error("Error loading recording session:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load latest recording session";
    return c.json({ error: message }, 500);
  }
});

// GET /api/egress/sessions?roomName=abc - Load all recording sessions for a room
egressRouter.get("/sessions", async (c) => {
  try {
    if (!isGcsConfigured()) {
      return c.json({ sessions: [] });
    }

    const { roomName } = LatestSchema.parse({
      roomName: c.req.query("roomName"),
    });
    const sessions = await listRecordingSessions(roomName);

    return c.json({ sessions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.issues[0]?.message }, 400);
    }
    console.error("Error loading recording sessions:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load recording sessions";
    return c.json({ error: message }, 500);
  }
});

// GET /api/egress/status - Check if GCS is configured
egressRouter.get("/status", async (c) => {
  return c.json({ gcsConfigured: isGcsConfigured() });
});
