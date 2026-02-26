import { Hono } from "hono";
import { Storage } from "@google-cloud/storage";

export const gcsRouter = new Hono();

function getStorage(): Storage {
  const credentials = process.env.GCS_CREDENTIALS;
  if (!credentials) throw new Error("GCS_CREDENTIALS not set");
  return new Storage({ credentials: JSON.parse(credentials) });
}

function getBucket(): string {
  const bucket = process.env.GCS_BUCKET;
  if (!bucket) throw new Error("GCS_BUCKET not set");
  return bucket;
}

// GET /api/egress/gcs?path=recordings/room/123/live.m3u8
// Proxies GCS objects so the browser can fetch HLS playlists and segments.
gcsRouter.get("/", async (c) => {
  try {
    const objectPath = c.req.query("path");
    if (!objectPath) {
      return c.json({ error: "path query parameter required" }, 400);
    }

    // Prevent directory traversal
    if (objectPath.includes("..")) {
      return c.json({ error: "Invalid path" }, 400);
    }

    const storage = getStorage();
    const file = storage.bucket(getBucket()).file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      return c.json({ error: "Not found" }, 404);
    }

    const [contents] = await file.download();

    let contentType = "application/octet-stream";
    if (objectPath.endsWith(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl";
    } else if (objectPath.endsWith(".ts")) {
      contentType = "video/mp2t";
    } else if (objectPath.endsWith(".mp4")) {
      contentType = "video/mp4";
    }

    let body: Uint8Array | string = new Uint8Array(contents);

    // Rewrite .m3u8 segment references to go through this proxy
    if (objectPath.endsWith(".m3u8")) {
      const dir = objectPath.substring(0, objectPath.lastIndexOf("/") + 1);
      const text = contents.toString("utf-8");
      body = text.replace(/^(seg_[^\s]+\.ts)$/gm, (seg) => {
        return `/api/egress/gcs?path=${encodeURIComponent(dir + seg)}`;
      });
    }

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          objectPath.endsWith(".m3u8") && objectPath.includes("live")
            ? "no-cache"
            : "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error fetching GCS object:", error);
    return c.json({ error: "Failed to fetch object" }, 500);
  }
});

// GET /api/egress/gcs/list?prefix=recordings/room/
// Lists recording prefixes in the bucket.
gcsRouter.get("/list", async (c) => {
  try {
    const prefix = c.req.query("prefix") || "recordings/";
    const storage = getStorage();
    const [files] = await storage.bucket(getBucket()).getFiles({
      prefix,
    });

    const playlists = files
      .map((f) => f.name)
      .filter((name) => name.endsWith(".m3u8"));

    return c.json({ playlists });
  } catch (error) {
    console.error("Error listing GCS objects:", error);
    return c.json({ error: "Failed to list recordings" }, 500);
  }
});
