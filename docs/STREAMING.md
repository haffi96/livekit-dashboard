# H.264 Streaming with GStreamer and LiveKit

This guide shows how to generate and publish H.264 streams to a LiveKit room using GStreamer and the LiveKit CLI tooling, then view them in the monitoring dashboard.

## Prerequisites

### 1. LiveKit Credentials

Add to `.env` (or export in your shell):

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### 2. GStreamer

**Ubuntu/Debian:**
```bash
sudo apt install gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-x
```

**macOS:**
```bash
brew install gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugins-ugly
```

### 3. GStreamer Publisher

```bash
go install github.com/livekit/gstreamer-publisher@latest
```

Ensure `$GOPATH/bin` or `$HOME/go/bin` is in your `PATH`.

### 4. LiveKit CLI (optional, for token creation fallback)

```bash
# Linux
curl -sSL https://get.livekit.io/cli | bash

# macOS
brew install livekit-cli
```

## Quick Start

### 1. Start the dashboard

```bash
IRON_SESSION_PASSWORD="any-32-char-secret-minimum" pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and enter your LiveKit credentials.

### 2. Publish H.264 stream

```bash
./scripts/stream-h264.sh
```

Defaults to room `stream-test`. Use a custom room:

```bash
./scripts/stream-h264.sh my-room
```

### 3. View the stream

1. In the dashboard, go to the rooms list.
2. Open the room `stream-test` (or your room name).
3. The GStreamer test pattern with clock overlay will appear in the video grid.

## Manual Steps (without the script)

### Generate publish token

```bash
TOKEN=$(node scripts/gen-publish-token.mjs stream-test)
export LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET
export LIVEKIT_PUBLISH_TOKEN=$TOKEN
```

Or with LiveKit CLI:

```bash
TOKEN=$(lk token create --room stream-test --identity gstreamer-publisher --join --grant '{"canPublish":true}')
```

### Run gstreamer-publisher

```bash
gstreamer-publisher --token $LIVEKIT_PUBLISH_TOKEN -- \
  videotestsrc is-live=true ! \
    video/x-raw,width=1280,height=720,framerate=30/1 ! \
    clockoverlay ! \
    videoconvert ! \
    x264enc tune=zerolatency key-int-max=60 bitrate=2000 ! \
    video/x-h264,profile=baseline
```

### Add audio (optional)

```bash
gstreamer-publisher --token $LIVEKIT_PUBLISH_TOKEN -- \
  videotestsrc is-live=true ! video/x-raw,width=1280,height=720 ! clockoverlay ! videoconvert ! x264enc tune=zerolatency key-int-max=60 bitrate=2000 \
  audiotestsrc is-live=true ! audioresample ! audioconvert ! opusenc bitrate=64000
```

## Pipeline notes

- **videotestsrc**: Test pattern; replace with `v4l2src` for a real camera.
- **x264enc**: H.264 encoder; `tune=zerolatency` reduces latency.
- **video/x-h264,profile=baseline**: Ensures WebRTC-compatible output.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `gstreamer-publisher not found` | Add `$HOME/go/bin` to PATH: `export PATH=$PATH:$HOME/go/bin` |
| `GStreamer not found` | Install GStreamer packages (see above). |
| `Package gstreamer-1.0 was not found` | Install GStreamer dev packages if building from source. |
| Green screen / no video | Try `profile=baseline` or `profile=constrained-baseline` on the caps. |
| Token rejected | Ensure `canPublish: true` and credentials match your LiveKit server. |
