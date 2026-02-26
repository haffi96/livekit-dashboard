#!/bin/bash
# Publish H.264 test stream to LiveKit using GStreamer and gstreamer-publisher.
#
# Prerequisites:
#   - LiveKit credentials in env: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
#   - GStreamer 1.20+ with plugins (gst-launch-1.0, x264enc)
#   - gstreamer-publisher: go install github.com/livekit/gstreamer-publisher@latest
#
# Usage: ./scripts/stream-h264.sh [room-name]

set -e

ROOM="${1:-stream-test}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env if present
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_ROOT/.env"
  set +a
fi

for v in LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET; do
  if [ -z "${!v}" ]; then
    echo "Error: $v is not set. Add to .env or export."
    exit 1
  fi
done

if ! command -v gstreamer-publisher &>/dev/null; then
  echo "gstreamer-publisher not found. Install with:"
  echo "  go install github.com/livekit/gstreamer-publisher@latest"
  echo ""
  echo "Note: GStreamer 1.20+ must be installed for gstreamer-publisher to work."
  exit 1
fi

if ! command -v gst-launch-1.0 &>/dev/null; then
  echo "GStreamer not found. Install with:"
  echo "  Ubuntu/Debian: sudo apt install gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-x"
  echo "  macOS: brew install gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugins-ugly"
  exit 1
fi

echo "Generating publish token for room: $ROOM"
TOKEN=$(node "$SCRIPT_DIR/gen-publish-token.mjs" "$ROOM")
export LIVEKIT_PUBLISH_TOKEN="$TOKEN"

echo "Creating room (if not exists) and publishing H.264 stream..."
if command -v lk &>/dev/null; then
  lk room create --name "$ROOM" 2>/dev/null || true
fi

echo "Streaming to room: $ROOM"
echo "View at: http://localhost:3000 (enter credentials and open room)"
echo ""

export LIVEKIT_URL
gstreamer-publisher \
  --token "$LIVEKIT_PUBLISH_TOKEN" \
  -- \
  videotestsrc is-live=true ! \
    video/x-raw,width=1280,height=720,framerate=30/1 ! \
    clockoverlay ! \
    videoconvert ! \
    x264enc tune=zerolatency key-int-max=60 bitrate=2000 ! \
    video/x-h264,profile=baseline
