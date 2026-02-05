# LiveKit Monitoring Dashboard

A Next.js application for monitoring and connecting to LiveKit rooms. View camera feeds and receive telemetry data in real-time.

![dashboard](./docs/dashboard-view.png)
![room-view](./docs/room-view.png)


## Features

- **Room Listing**: View all active LiveKit rooms on the landing page
- **Video Grid**: Subscribe to and display camera feeds from connected devices
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

2. Copy the environment example file and configure your LiveKit credentials:

```bash
cp .env.example .env.local
```

3. Edit `.env.local` with your LiveKit server details:

```env
# LiveKit Server Configuration
LIVEKIT_API_URL=https://your-livekit-server.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# LiveKit Client Configuration (public)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
```

## Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production

Build and run:

```bash
pnpm build
pnpm start
```

## Architecture

### API Routes

- `GET /api/rooms` - List all active LiveKit rooms
- `POST /api/token` - Generate a viewer token for joining a room
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
