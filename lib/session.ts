import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface LiveKitCredentials {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export interface SessionData {
  credentials?: LiveKitCredentials;
}

export const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD as string,
  cookieName: "livekit-session",
  cookieOptions: {
    // secure: true should be used in production (HTTPS)
    // but for development, we need to use false
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

/**
 * Get the iron-session from cookies.
 * Use this in API routes to access session data.
 */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
