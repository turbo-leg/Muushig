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

## Theme — "Cozy Hand-Drawn Tavern"

Warm parchment + wood + amber with a Caveat handwriting face. The theme lives in
`src/index.css` (Tailwind v4 `@theme` tokens → `bg-wood`, `text-ink`,
`text-amber`, …) plus a few hand-written classes (`.btn-wood`, `.playing-card`,
`.wood-surface`, `.parchment`, `.card-thrown`).

### Dropping in real art (no markup changes)

Every texture is a CSS variable with a gradient fallback. Override it with a
`url(...)` once you have assets:

| Variable          | What it skins               | Where                                        |
| ----------------- | --------------------------- | -------------------------------------------- |
| `--tex-room`      | tavern background           | `.room` (set on `:root`)                     |
| `--tex-wood`      | the table surface           | `.wood-surface`                              |
| `--tex-parchment` | panels / seats / card faces | `.parchment`                                 |
| `--card-back`     | card backs                  | `.playing-card--back`                        |
| `--card-art`      | a specific card face        | `<PlayingCard art="/assets/cards/AS.png" />` |

Example (e.g. in `index.css` or a runtime style):

```css
:root {
  --tex-room: url('/assets/tavern.jpg');
  --tex-wood: url('/assets/table.jpg');
}
```

Cards are `aspect-ratio: 5/7` divs, so watercolor images fit without distortion.
Cards thrown to the center get a stable, seeded −5°…+5° tilt (`tiltFor`).

## Status

Issue #3 in progress: scaffold, Colyseus `useRoom`, Discord identity (guest
fallback), the unified **table** (lobby → decision → swap → play → finished),
swap/play interactions, trump reveal, sound, and the Tavern theme. Still to come:
a polished scoring/winner screen, dealer rotation, and the Discord OAuth token
exchange.
