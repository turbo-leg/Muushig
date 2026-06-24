# @muushig/client

React + Vite + TypeScript client for the Muushig Discord Activity, styled with
the **Tengri Nights** design system (see [`/design-system`](../../design-system)).
Connects to `@muushig/server` over the Colyseus JS client.

## Run

```bash
# Terminal 1 — game server
npm run dev -w @muushig/server     # ws://localhost:2567

# Terminal 2 — client (Vite dev server, proxies to the game server)
npm run dev -w @muushig/client     # http://localhost:5173
```

Open two browser tabs at http://localhost:5173 to join the same room (both use
the `local-dev` instance id), ready up, and start.

```bash
npm run build -w @muushig/client      # tsc -b && vite build
npm run typecheck -w @muushig/client
npm test -w @muushig/client           # vitest + Testing Library
```

## Environment

Copy `.env.example` if needed:

- `VITE_DISCORD_CLIENT_ID` — enables the Discord Embedded App SDK when embedded.
- `VITE_SERVER_URL` — game server URL (default `ws://localhost:2567`).

## Status

First slice of issue #3: app scaffold, Colyseus connection (`useRoom`), Discord
identity (guest fallback in dev), constellation background, and the **Lobby**
(ready-up / host start). Still to come: swap UI, the play table, the trump
reveal, scoring, and the Discord OAuth token exchange.
