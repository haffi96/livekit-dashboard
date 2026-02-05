import { Hono } from "hono";
import { z } from "zod";
import { createToken } from "@/lib/livekit/server";

export const tokenRouter = new Hono();

const TokenRequestSchema = z.object({
  roomName: z.string().min(1, "Room name is required"),
  participantName: z.string().min(1, "Participant name is required"),
});

// POST /api/token - Generate a token for joining a room
tokenRouter.post("/", async (c) => {
  try {
    const json = await c.req.json();
    const { roomName, participantName } = TokenRequestSchema.parse(json);

    const token = await createToken(roomName, participantName);

    return c.json({ token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.issues }, 400);
    }
    console.error("Error generating token:", error);
    return c.json({ error: "Failed to generate token" }, 500);
  }
});
