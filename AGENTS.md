# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **LiveKit Monitoring Dashboard** — a Next.js 16 app (App Router + Turbopack) that lets users enter LiveKit server credentials via UI, view active rooms, and monitor video/telemetry streams. No database or Docker required.

### Running the dev server

```bash
IRON_SESSION_PASSWORD="<any-32+-char-secret>" pnpm dev
```

The dev server runs on `localhost:3000` with Turbopack. The `IRON_SESSION_PASSWORD` env var is **required** at runtime for encrypted session cookies (iron-session). Any string >= 32 characters works for development.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Dev server | `pnpm dev` |
| Lint (ESLint) | `pnpm lint` |
| Format check | `pnpm fmt:check` |
| Format fix | `pnpm fmt` |
| Build | `pnpm build` |

### Gotchas

- `IRON_SESSION_PASSWORD` must be set before running `pnpm dev` or `pnpm build`, otherwise session/credential storage will fail at runtime.
- The app validates LiveKit credentials by attempting to list rooms on the provided server. Without a real LiveKit server, the credential form will show a connection error — this is expected behavior.
- `pnpm-workspace.yaml` uses `ignoredBuiltDependencies` for `cbor-extract`, `sharp`, and `unrs-resolver` to avoid native build issues.
- There are no automated tests in this repo — only ESLint and Prettier checks.
