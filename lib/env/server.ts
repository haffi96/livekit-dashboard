import { z } from "zod";

const envSchema = z.object({
  LIVEKIT_API_URL: z.string().url(),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
});

export const envServer = envSchema.parse({
  LIVEKIT_API_URL: process.env.LIVEKIT_API_URL,
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
});
