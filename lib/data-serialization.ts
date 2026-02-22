"use client";

import { decode as decodeCbor, encode as encodeCbor } from "cbor-x";

export type SerializationMode = "json-only" | "json-gzip" | "json-cbor";
export interface OutgoingMessageEnvelope {
  sequence: number;
  timestamp: number;
  data: unknown;
}

export const SERIALIZATION_MODE_OPTIONS: Array<{
  value: SerializationMode;
  label: string;
}> = [
  { value: "json-only", label: "JSON only" },
  { value: "json-gzip", label: "JSON + gzip" },
  { value: "json-cbor", label: "JSON + cbor" },
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
}

export function buildMessageEnvelope(
  payloadText: string,
  sequence: number,
  timestamp: number,
): OutgoingMessageEnvelope {
  return {
    sequence,
    timestamp,
    data: JSON.parse(payloadText) as unknown,
  };
}

async function gzipCompress(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") {
    throw new Error("gzip compression is not supported in this browser");
  }
  const compressedStream = new Blob([toArrayBuffer(data)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const compressed = await new Response(compressedStream).arrayBuffer();
  return new Uint8Array(compressed);
}

async function gzipDecompress(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("gzip decompression is not supported in this browser");
  }
  const decompressedStream = new Blob([toArrayBuffer(data)])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const decompressed = await new Response(decompressedStream).arrayBuffer();
  return new Uint8Array(decompressed);
}

export async function encodePayloadByMode(
  payload: OutgoingMessageEnvelope,
  mode: SerializationMode,
): Promise<Uint8Array> {
  const payloadJson = JSON.stringify(payload);

  if (mode === "json-only") {
    return encoder.encode(payloadJson);
  }

  if (mode === "json-gzip") {
    return gzipCompress(encoder.encode(payloadJson));
  }

  return encodeCbor(payload);
}

export async function decodePayloadByMode(
  payload: Uint8Array,
  mode: SerializationMode,
): Promise<string> {
  if (mode === "json-only") {
    const parsed = JSON.parse(decoder.decode(payload)) as unknown;
    return JSON.stringify(parsed, null, 2);
  }

  if (mode === "json-gzip") {
    const unzipped = await gzipDecompress(payload);
    const parsed = JSON.parse(decoder.decode(unzipped)) as unknown;
    return JSON.stringify(parsed, null, 2);
  }

  const parsed = decodeCbor(payload) as unknown;
  return JSON.stringify(parsed, null, 2);
}
