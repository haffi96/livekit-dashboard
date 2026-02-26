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

function getEnvCredentials() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (url && apiKey && apiSecret) return { url, apiKey, apiSecret };
  return null;
}

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

// GET /api/credentials - Check if session has credentials.
// Auto-seeds the session from LIVEKIT_* env vars on first check.
credentialsRouter.get("/", async (c) => {
  try {
    const session = await getSession();

    if (session.credentials) {
      return c.json({ url: session.credentials.url, connected: true });
    }

    const env = getEnvCredentials();
    if (env) {
      session.credentials = env;
      await session.save();
      return c.json({ url: env.url, connected: true });
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
