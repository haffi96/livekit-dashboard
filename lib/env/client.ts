"use client";
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_LIVEKIT_URL: z.string().url(),
});

export const envClient = envSchema.parse({
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
});
