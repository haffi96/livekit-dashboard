import {
  EgressClient,
  EgressInfo,
  SegmentedFileOutput,
  GCPUpload,
  SegmentedFileProtocol,
  EncodedFileOutput,
  EncodedFileType,
} from "livekit-server-sdk";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { getSession } from "@/lib/session";

function toHttpUrl(url: string): string {
  if (url.startsWith("wss://")) return url.replace(/^wss:\/\//, "https://");
  if (url.startsWith("ws://")) return url.replace(/^ws:\/\//, "http://");
  return url;
}

function getGcsConfig(): { bucket: string; credentials: string } | null {
  const bucket = process.env.GCS_BUCKET;
  const credentials = resolveGcsCredentials();
  if (bucket && credentials) return { bucket, credentials };
  return null;
}

function expandHomePath(path: string): string {
  if (path.startsWith("~/")) {
    return resolve(homedir(), path.slice(2));
  }
  return path;
}

function resolveGcsCredentials(): string | undefined {
  const raw = process.env.GCS_CREDENTIALS;
  if (!raw) return undefined;

  const value = raw.trim();
  if (value.startsWith("{")) {
    // Validate JSON early to avoid runtime errors when starting egress.
    JSON.parse(value);
    return value;
  }

  const filePath = expandHomePath(value);
  const fileContents = readFileSync(filePath, "utf8").trim();
  JSON.parse(fileContents);
  return fileContents;
}

async function getEgressClient(): Promise<EgressClient> {
  const session = await getSession();
  const creds = session.credentials ?? getEnvCredentials();
  if (!creds) throw new Error("Not authenticated");

  return new EgressClient(toHttpUrl(creds.url), creds.apiKey, creds.apiSecret);
}

function getEnvCredentials() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (url && apiKey && apiSecret) return { url, apiKey, apiSecret };
  return null;
}

function gcsUpload(): GCPUpload {
  const gcs = getGcsConfig();
  if (!gcs) throw new Error("GCS_BUCKET and GCS_CREDENTIALS env vars required");
  return new GCPUpload({ bucket: gcs.bucket, credentials: gcs.credentials });
}

export async function startRoomCompositeSegmentEgress(
  roomName: string,
): Promise<EgressInfo> {
  const client = await getEgressClient();
  const prefix = `recordings/${roomName}/${Date.now()}`;

  const segments = new SegmentedFileOutput({
    filenamePrefix: `${prefix}/seg`,
    playlistName: `${prefix}/playlist.m3u8`,
    livePlaylistName: `${prefix}/live.m3u8`,
    segmentDuration: 4,
    protocol: SegmentedFileProtocol.HLS_PROTOCOL,
    output: { case: "gcp", value: gcsUpload() },
  });

  return client.startRoomCompositeEgress(roomName, { segments });
}

export async function startTrackEgress(
  roomName: string,
  trackId: string,
): Promise<EgressInfo> {
  const client = await getEgressClient();
  const prefix = `recordings/${roomName}/${Date.now()}`;

  const file = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: `${prefix}/track-${trackId}.mp4`,
    output: { case: "gcp", value: gcsUpload() },
  });

  return client.startTrackCompositeEgress(
    roomName,
    { file },
    undefined,
    trackId,
  );
}

export async function stopEgress(egressId: string): Promise<EgressInfo> {
  const client = await getEgressClient();
  return client.stopEgress(egressId);
}

export async function listEgress(roomName?: string): Promise<EgressInfo[]> {
  const client = await getEgressClient();
  return client.listEgress({ roomName });
}

export function getRecordingPrefix(roomName: string, timestamp: number) {
  return `recordings/${roomName}/${timestamp}`;
}

export function isGcsConfigured(): boolean {
  return getGcsConfig() !== null;
}
