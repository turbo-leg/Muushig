# @muushig/server

Authoritative Colyseus room for Muushig. Owns the real `GameState` and delegates
every rule decision to the `@muushig/shared` engine; clients send only intents.

## Run

```bash
npm run dev -w @muushig/server     # nodemon (ts-node)
npm run start -w @muushig/server   # ts-node
npm test -w @muushig/server        # @colyseus/testing integration tests
```

Configure via `.env` (see `../../.env.example`): `PORT`, optional `REDIS_URL`
(presence/driver for horizontal scale), `NODE_ENV`.

- Colyseus monitor: `/colyseus`
- Health check: `/health`

## Room: `muushig`

Phase machine: `waiting → decision → swap → playing → finished`, looping
`playing → decision` between rounds until a player reaches a winning score.

| Message                     | Effect                                                       |
| --------------------------- | ------------------------------------------------------------ |
| `ready`                     | Toggle ready in the lobby                                    |
| `start`                     | Host-only; deals the first round once all are ready          |
| `stay`                      | Choose to play the round (decision phase)                    |
| `resign`                    | Sit the round out (decision phase)                           |
| `swap` `{ indices }`        | Exchange up to 5 cards (swap phase, stayers only)            |
| `playCard` `{ suit, rank }` | Play a card on your turn                                     |
| `rematch`                   | Vote to reset scores and return to the lobby (when finished) |

Decision, swap, and turn timers auto-advance play (decision/swap timeouts keep a
player in with their dealt cards; turn timeout plays the first legal card). All
are configurable per-room and disabled in tests.
