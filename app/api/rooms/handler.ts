import { Hono } from "hono";
import { listRooms } from "@/lib/livekit/server";

export const roomsRouter = new Hono();

// GET /api/rooms - List all active rooms
roomsRouter.get("/", async (c) => {
  try {
    const rooms = await listRooms();
    return c.json({ rooms });
  } catch (error) {
    console.error("Error listing rooms:", error);
    return c.json({ error: "Failed to list rooms" }, 500);
  }
});
