import { Storage } from "@google-cloud/storage";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

function expandHomePath(path: string): string {
  if (path.startsWith("~/")) {
    return resolve(homedir(), path.slice(2));
  }

  return path;
}

function getStorageAuthOptions():
  | { credentials: Record<string, unknown> }
  | { keyFilename: string } {
  const raw = process.env.GCS_CREDENTIALS;
  if (!raw) throw new Error("GCS_CREDENTIALS not set");

  const value = raw.trim();
  if (value.startsWith("{")) {
    return { credentials: JSON.parse(value) as Record<string, unknown> };
  }

  const keyFilename = expandHomePath(value);
  readFileSync(keyFilename, "utf8");
  return { keyFilename };
}

export function getBucket(): string {
  const bucket = process.env.GCS_BUCKET;
  if (!bucket) throw new Error("GCS_BUCKET not set");
  return bucket;
}

export function getStorage(): Storage {
  return new Storage(getStorageAuthOptions());
}

export async function listObjects(prefix: string): Promise<string[]> {
  const [files] = await getStorage().bucket(getBucket()).getFiles({ prefix });
  return files.map((file) => file.name);
}

export async function downloadObjectText(path: string): Promise<string | null> {
  const file = getStorage().bucket(getBucket()).file(path);
  const [exists] = await file.exists();
  if (!exists) return null;

  const [contents] = await file.download();
  return contents.toString("utf8");
}

export async function uploadObjectText(
  path: string,
  body: string,
  contentType: string,
): Promise<void> {
  await getStorage().bucket(getBucket()).file(path).save(body, { contentType });
}
