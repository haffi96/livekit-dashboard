import { Hono } from "hono";
import { listRoomsWithCredentials } from "@/lib/livekit/server";
import { getSession } from "@/lib/session";

export const roomsRouter = new Hono();

// POST /api/rooms - List all active rooms (reads credentials from session)
roomsRouter.post("/", async (c) => {
  try {
    const session = await getSession();

    if (!session.credentials) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { url, apiKey, apiSecret } = session.credentials;
    const rooms = await listRoomsWithCredentials(url, apiKey, apiSecret);
    return c.json({ rooms });
  } catch (error) {
    console.error("Error listing rooms:", error);
    return c.json(
      { error: "Failed to list rooms. Please check your credentials." },
      500,
    );
  }
});
