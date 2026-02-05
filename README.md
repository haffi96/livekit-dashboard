# LiveKit Monitoring Dashboard

A Next.js application for monitoring and connecting to LiveKit rooms. View camera feeds and receive telemetry data in real-time.

![dashboard](./docs/dashboard-view.png)
![room-view](./docs/room-view.png)

## Features

- **No Server Configuration Required**: Enter your LiveKit credentials directly in the UI
- **Room Listing**: View all active LiveKit rooms on the landing page
- **Video Grid**: Subscribe to and display camera feeds from connected devices
- **RTC Stats**: View detailed WebRTC statistics for each video track
- **Telemetry Panel**: Real-time telemetry data visualization with:
  - Message rate (Hz)
  - Message size statistics
  - Rolling message stream

## Prerequisites

- Node.js 20.9.0 or higher
- pnpm
- A LiveKit server (cloud or self-hosted)

## Setup

1. Clone the repository and install dependencies:

```bash
pnpm install
```

2. Run the development server:

```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. Enter your LiveKit credentials when prompted:
   - **LiveKit URL**: Your LiveKit server WebSocket URL (e.g., `wss://your-server.livekit.cloud`)
   - **API Key**: Your LiveKit API key
   - **API Secret**: Your LiveKit API secret

## Security

- **Session Storage Only**: Credentials are stored in your browser's session storage
- **Cleared on Tab Close**: Credentials are automatically cleared when you close the browser tab
- **No Server Storage**: Credentials are never stored on the server - they are passed per-request
- **Direct Connection**: Credentials are only sent to your own LiveKit server

## Production

Build and run:

```bash
pnpm build
pnpm start
```

## Architecture

### API Routes

- `POST /api/rooms` - List all active LiveKit rooms (requires credentials in body)
- `POST /api/token` - Generate a viewer token for joining a room (requires credentials in body)
- `GET /api/healthz` - Health check endpoint

### Data Channels

The app subscribes to a data channel named `telemetry` for receiving telemetry data. The telemetry panel displays:

- Current message rate (Hz)
- Average message size
- Total message count
- Real-time message stream

### Viewer Mode

The dashboard operates in viewer-only mode:

- Subscribers do not publish video/audio
- Only camera feeds from livekit rooms are displayed
- The local participant is excluded from the video grid

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **API**: Hono
- **LiveKit**: livekit-server-sdk, livekit-client, @livekit/components-react
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Package Manager**: pnpm
