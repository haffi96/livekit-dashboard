import { Hono } from "hono";
import { z } from "zod";
import { listRoomsWithCredentials } from "@/lib/livekit/server";

export const roomsRouter = new Hono();

const CredentialsSchema = z.object({
  url: z.string().min(1, "LiveKit URL is required"),
  apiKey: z.string().min(1, "API Key is required"),
  apiSecret: z.string().min(1, "API Secret is required"),
});

// POST /api/rooms - List all active rooms (requires credentials in body)
roomsRouter.post("/", async (c) => {
  try {
    const json = await c.req.json();
    const { url, apiKey, apiSecret } = CredentialsSchema.parse(json);

    const rooms = await listRoomsWithCredentials(url, apiKey, apiSecret);
    return c.json({ rooms });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { error: error.issues[0]?.message || "Invalid credentials" },
        400,
      );
    }
    console.error("Error listing rooms:", error);
    return c.json(
      { error: "Failed to list rooms. Please check your credentials." },
      500,
    );
  }
});
