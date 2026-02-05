import { Hono } from "hono";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { listRoomsWithCredentials } from "@/lib/livekit/server";

export const credentialsRouter = new Hono();

const CredentialsSchema = z.object({
  url: z.string().min(1, "LiveKit URL is required"),
  apiKey: z.string().min(1, "API Key is required"),
  apiSecret: z.string().min(1, "API Secret is required"),
});

// POST /api/credentials - Set credentials in session
credentialsRouter.post("/", async (c) => {
  try {
    const json = await c.req.json();
    const credentials = CredentialsSchema.parse(json);

    // Validate credentials by attempting to list rooms
    await listRoomsWithCredentials(
      credentials.url,
      credentials.apiKey,
      credentials.apiSecret,
    );

    // Credentials are valid, store in session
    const session = await getSession();
    session.credentials = credentials;
    await session.save();

    // Return only the URL, not the secrets
    return c.json({
      url: credentials.url,
      connected: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { error: error.issues[0]?.message || "Invalid credentials" },
        400,
      );
    }
    console.error("Error setting credentials:", error);
    return c.json(
      {
        error:
          "Failed to connect to LiveKit server. Please check your credentials.",
      },
      401,
    );
  }
});

// GET /api/credentials - Check if session has credentials
credentialsRouter.get("/", async (c) => {
  try {
    const session = await getSession();

    if (session.credentials) {
      return c.json({
        url: session.credentials.url,
        connected: true,
      });
    }

    return c.json({ connected: false });
  } catch (error) {
    console.error("Error getting credentials:", error);
    return c.json({ connected: false });
  }
});

// DELETE /api/credentials - Clear session
credentialsRouter.delete("/", async (c) => {
  try {
    const session = await getSession();
    session.destroy();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error clearing credentials:", error);
    return c.json({ error: "Failed to clear credentials" }, 500);
  }
});
