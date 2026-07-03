# Architecture

Muushig is a Discord Activity (an embedded web app running inside Discord's
voice/iframe context) — and a standalone web game — backed by an authoritative
Colyseus server. One Fly.io app serves both the API/WebSocket server and the
built client.

```
┌────────────────────┐        WebSocket (Colyseus)        ┌─────────────────────┐
│  @muushig/client    │ ◀────── room state sync ─────────▶ │  @muushig/server     │
│  React + Vite       │        client → server msgs         │  Colyseus room       │
│  Discord Embed SDK  │                                     │  (authoritative)     │
└─────────┬──────────┘                                     └──────────┬──────────┘
          │                                                            │
          │                    imports                                 │ imports
          └──────────────────────────┐              ┌──────────────────┘
                                      ▼              ▼
                              ┌─────────────────────────────┐
                              │  @muushig/shared             │
                              │  • Colyseus @type schema     │
                              │    (Card, Player, GameState) │
                              │  • MuushigEngine (pure rules)│
                              │  • MuushigBot (heuristics)   │
                              └─────────────────────────────┘
                                             │
                                             ▼ (service role, server-only)
                                    ┌──────────────────┐
                                    │  Supabase         │
                                    │  auth · profiles  │
                                    │  matches · rounds │
                                    │  stats · Elo      │
                                    └──────────────────┘
```

## Principles

- **Authoritative server.** The server owns the real `GameState`. Clients render
  the synced schema and send intents (`swap`, `playCard`, `resign`, `kick`,
  `leaveTable`…); they never mutate game state directly.
- **Pure, deterministic engine.** `MuushigEngine` is a set of static methods with
  no I/O, no time, and an injectable RNG for shuffling. This makes the rules
  fully unit-testable and identical on server and client. `MuushigBot` builds on
  it with the same purity.
- **Schema = wire format.** State classes extend `@colyseus/schema` `Schema`, so
  the same types describe both in-memory state and the network-synced view.
  Sensitive data (verified auth UUIDs) stays in server-side maps, never on the
  schema.
- **Stats must never break the game.** Match recording is fire-and-forget after
  the `gameOver` broadcast, retried with backoff, and skipped entirely when
  persistence is unconfigured.

## Packages

### `@muushig/shared`

- `src/state/` — `Card`, `Player`, `TrickPlay`, `GameState` schema classes.
- `src/engine/MuushigEngine.ts` — deck creation, dealing, decision phase, swap,
  navshih, trick legality and resolution, scoring (start 15, count down; +5
  shut-out; haranhui fold cap).
- `src/engine/MuushigBot.ts` — pure rules-based bot (bid on strength, discard
  low off-suit, win tricks cheaply).

### `@muushig/server`

- `src/rooms/MuushigRoom.ts` — the authoritative `Room<GameState>`: lobby with
  bots and host controls (kick, add/remove bot), phase machine
  `waiting → decision → swap → playing → finished` (looping to `decision`
  between rounds with a paced score-reveal pause), per-turn timers with
  auto-actions, mid-game reconnection holds with bot takeover, spectators
  (mid-game joiners, promoted at rematch), private tables with join codes,
  rematch.
- `src/stats/` — `StatsCollector` (per-round match record), `elo.ts`
  (multiplayer Elo, all-human games only), `MatchRecorder` (writes via the
  `record_match_v2` RPC with the service role).
- `src/lib/` — Supabase admin + token verification, structured one-line JSON
  logging, username profanity filter (en/mn).
- `app.config.ts` — room registration (`filterBy discordInstanceId/maxPlayers`),
  Express routes: `/health`, `/api/token` (Discord OAuth exchange),
  `/api/table/:code` (join-code resolver), `/api/client-error` (client error
  reports → log), `@colyseus/monitor`, static client + SPA fallback. Optional
  Redis presence/driver for horizontal scale (`REDIS_URL`).

### `@muushig/client`

React + Vite app using the Discord Embedded App SDK (OAuth, rich presence,
invites, speaking rings, PiP, thermal throttling) and the Colyseus JS client.
Cards are rendered from a bundled SVG deck via a `PlayingCard` component (per
project convention — never hand-drawn in CSS).

- `src/net/useRoom.ts` — join intents (quick / host table / join code),
  reconnection-token persistence, terminal statuses (kicked / closed).
- `src/i18n/` — full en/mn catalog (`t`/`tAlt`/`useLocale`).
- `src/audio/` — procedural Web Audio SFX + generative tavern music on
  persistent gain buses (no audio assets).
- Surfaces: web Lobby, tavern Table, HelpBook rules, Settings, Profile with
  deep stats + rating sparkline, Leaderboard, post-game recap, celebration.
- `ErrorBoundary` + window hooks report crashes to `/api/client-error`.

## Persistence (Supabase)

Migrations in `supabase/`: `0001_accounts.sql` (profiles, player_stats,
matches, match_results, `record_match` v1) and `0002_deep_stats.sql`
(match_rounds per-seat-per-round history, extended rollups, streaks, Elo
rating, `leaderboard` view, `record_match_v2`). RLS: world-SELECT everywhere;
writes only via the service role from the game server. The client reads with
the anon key (Profile, Leaderboard).

## Deployment

Single Fly.io app (`muushig`): the Dockerfile builds the client (Vite vars as
build args) and the server serves it. Server secrets (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `DISCORD_CLIENT_ID/SECRET`) come from Fly
secrets; without them the game runs fully in guest mode with stats disabled.
See `docs/DISCORD_SETUP.md` for Activity registration.
