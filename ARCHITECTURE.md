# Architecture

Muushig is a Discord Activity (an embedded web app running inside Discord's
voice/iframe context) backed by an authoritative Colyseus server.

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
                              └─────────────────────────────┘
```

## Principles

- **Authoritative server.** The server owns the real `GameState`. Clients render
  the synced schema and send intents (`swap`, `playCard`, `resign`); they never
  mutate game state directly.
- **Pure, deterministic engine.** `MuushigEngine` is a set of static methods with
  no I/O, no time, and an injectable RNG for shuffling. This makes the rules
  fully unit-testable and identical on server and client.
- **Schema = wire format.** State classes extend `@colyseus/schema` `Schema`, so
  the same types describe both in-memory state and the network-synced view.

## Packages

### `@muushig/shared`

- `src/state/` — `Card`, `Player`, `TrickPlay`, `GameState` schema classes.
- `src/engine/MuushigEngine.ts` — deck creation, dealing, swap, trick legality
  and resolution, scoring.
- `tests/` — vitest specs covering each engine concern.

### `@muushig/server` (planned)

A Colyseus `Room<GameState>` that wires player connections to engine calls,
manages phase transitions and turn timers, and uses Redis presence/driver for
horizontal scale (mirroring Durak).

### `@muushig/client` (planned)

React + Vite app using the Discord Embedded App SDK for auth and the Colyseus
JS client for state. Cards are rendered from a bundled SVG deck via a
`PlayingCard` component (per project convention — never hand-drawn in CSS).
