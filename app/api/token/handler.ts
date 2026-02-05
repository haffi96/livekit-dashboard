import { Hono } from "hono";
import { z } from "zod";
import { createTokenWithCredentials } from "@/lib/livekit/server";
import { getSession } from "@/lib/session";

export const tokenRouter = new Hono();

const TokenRequestSchema = z.object({
  roomName: z.string().min(1, "Room name is required"),
  participantName: z.string().min(1, "Participant name is required"),
});

// POST /api/token - Generate a token for joining a room (reads credentials from session)
tokenRouter.post("/", async (c) => {
  try {
    const session = await getSession();

    if (!session.credentials) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const json = await c.req.json();
    const { roomName, participantName } = TokenRequestSchema.parse(json);

    const { apiKey, apiSecret } = session.credentials;
    const token = await createTokenWithCredentials(
      apiKey,
      apiSecret,
      roomName,
      participantName,
    );

    return c.json({ token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { error: error.issues[0]?.message || "Invalid request" },
        400,
      );
    }
    console.error("Error generating token:", error);
    return c.json({ error: "Failed to generate token" }, 500);
  }
});
