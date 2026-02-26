#!/usr/bin/env node
/**
 * Generate a LiveKit access token with publish permission for GStreamer/CLI streaming.
 * Requires: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
 *
 * Usage: node scripts/gen-publish-token.mjs [room-name] [identity]
 *   room-name: default "stream-test"
 *   identity: default "gstreamer-publisher"
 */

import { AccessToken } from "livekit-server-sdk";

const room = process.argv[2] || "stream-test";
const identity = process.argv[3] || "gstreamer-publisher";

const url = process.env.LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

if (!url || !apiKey || !apiSecret) {
  console.error("Missing env vars. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET");
  process.exit(1);
}

const token = new AccessToken(apiKey, apiSecret, {
  identity,
  name: identity,
});

token.addGrant({
  roomJoin: true,
  room,
  canSubscribe: true,
  canPublish: true,
  canPublishData: true,
});

token.toJwt().then((jwt) => {
  console.log(jwt);
});
