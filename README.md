# Muushig (Муушиг) — Discord Activity

Multiplayer **Muushig**, one of Mongolia's most popular card games, built as a
[Discord Activity](https://discord.com/developers/docs/activities/overview).
Muushig is a trick-taking game for **2–5 players** (best with 5) played with a
32-card deck.

This repo is a Colyseus + React + TypeScript monorepo, structured after the
sibling [Durak](https://github.com/turbo-leg/Durak) project.

> **Status:** early scaffold. The rules engine (`@muushig/shared`) is implemented
> and unit-tested. The Colyseus server room and the React/Discord client are
> tracked as open issues — see the [milestones](../../milestones).

## Monorepo layout

```
packages/
  shared/   @muushig/shared — pure rules engine + Colyseus schema state (fully tested)
  server/   @muushig/server — Colyseus authoritative room (planned)
  client/   @muushig/client — React + Vite + Discord Embedded App SDK UI (planned)
```

The **rules engine lives in `shared`** and is deliberately framework-free and
deterministic so it can be unit-tested in isolation and reused by both server and
(for optimistic UI / bots) client.

## Getting started

```bash
npm install          # installs all workspaces

npm test             # run the shared engine test suite (vitest)
npm run typecheck    # type-check all packages
npm run lint         # prettier --check
npm run format       # prettier --write
```

Node ≥ 20 is required.

## Game rules

See [GAME_RULES.md](./GAME_RULES.md) for the full ruleset and the assumptions /
open questions baked into the engine. Architecture notes are in
[ARCHITECTURE.md](./ARCHITECTURE.md).

## Design

The client's visual system — **"Tengri Nights" (Eternal Blue Sky)** — is
documented in [design-system/](./design-system/), with ready-to-use CSS and
Tailwind tokens.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Work is issue-driven: one branch per
issue, tests-first where applicable, PRs into `main` gated by CI.

## License

[MIT](./LICENSE)
