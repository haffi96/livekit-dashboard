import {
  EgressClient,
  EgressInfo,
  SegmentedFileOutput,
  GCPUpload,
  SegmentedFileProtocol,
  EncodedFileOutput,
  EncodedFileType,
} from "livekit-server-sdk";
import { getSession } from "@/lib/session";

function toHttpUrl(url: string): string {
  if (url.startsWith("wss://")) return url.replace(/^wss:\/\//, "https://");
  if (url.startsWith("ws://")) return url.replace(/^ws:\/\//, "http://");
  return url;
}

function getGcsConfig(): { bucket: string; credentials: string } | null {
  const bucket = process.env.GCS_BUCKET;
  const credentials = process.env.GCS_CREDENTIALS;
  if (bucket && credentials) return { bucket, credentials };
  return null;
}

async function getEgressClient(): Promise<EgressClient> {
  const session = await getSession();
  const creds = session.credentials;
  if (!creds) throw new Error("Not authenticated");

  return new EgressClient(toHttpUrl(creds.url), creds.apiKey, creds.apiSecret);
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
