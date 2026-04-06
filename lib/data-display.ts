export function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

export function formatSize(bytes: number) {
  if (!Number.isFinite(bytes)) {
    return "0 B";
  }
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function normalizeEpochTimestampMs(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  if (timestamp >= 1e17) {
    return timestamp / 1_000_000;
  }

  if (timestamp >= 1e14) {
    return timestamp / 1_000;
  }

  return timestamp;
}

export function formatLatencyMs(latencyMs: number | null) {
  if (latencyMs === null || !Number.isFinite(latencyMs)) {
    return "No timestamp";
  }

  if (Math.abs(latencyMs) >= 1000) {
    return `${(latencyMs / 1000).toFixed(2)} s`;
  }

  return `${Math.round(latencyMs)} ms`;
}

