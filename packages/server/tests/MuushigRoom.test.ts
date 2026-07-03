import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import { MuushigEngine, Card, HAND_SIZE } from '@muushig/shared';
import appConfig from '../app.config';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await boot(appConfig);
});
afterAll(async () => {
  await colyseus.shutdown();
});
beforeEach(async () => {
  await colyseus.cleanup();
});

// Poll room state until a predicate holds (real timers under @colyseus/testing).
async function waitUntil(pred: () => boolean, timeoutMs = 4000): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitUntil timed out');
    await new Promise((r) => setTimeout(r, 15));
  }
}

// Rooms in tests run with timers disabled so flows are driven explicitly.
function createRoom(options: Record<string, unknown> = {}) {
  return colyseus.createRoom('muushig', {
    turnTimeLimit: 0,
    swapTimeLimit: 0,
    decisionTimeLimit: 0,
    ...options,
  });
}

type AnyRoom = Awaited<ReturnType<typeof createRoom>>;
type AnyClient = Awaited<ReturnType<typeof colyseus.connectTo>>;

function totalCardsInHands(room: AnyRoom): number {
  return [...room.state.seatOrder].reduce(
    (sum, id) => sum + room.state.players.get(id)!.hand.length,
    0,
  );
}

function clientFor(clients: AnyClient[], sessionId: string): AnyClient {
  const found = clients.find((c) => c.sessionId === sessionId);
  if (!found) throw new Error(`no client for ${sessionId}`);
  return found;
}

// Plays the first legal card for whoever is on turn.
function playTurn(room: AnyRoom, clients: AnyClient[]): void {
  const turnId = room.state.currentTurn;
  const player = room.state.players.get(turnId)!;
  const legal = MuushigEngine.legalMoves(
    [...player.hand] as Card[],
    [...room.state.currentTrick] as never[],
    room.state.ledSuit,
    room.state.trumpSuit,
  );
  const card = legal[0]!;
  clientFor(clients, turnId).send('playCard', { suit: card.suit, rank: card.rank });
}

// Drives a round to conclusion: everyone stays, keeps their cards, then plays.
async function playOneRound(room: AnyRoom, clients: AnyClient[]): Promise<void> {
  if (room.state.phase === 'decision') {
    for (const id of [...room.state.seatOrder]) clientFor(clients, id).send('stay');
    await waitUntil(() => room.state.phase !== 'decision');
  }
  if (room.state.phase === 'swap') {
    for (const id of [...room.state.seatOrder]) {
      if (!room.state.players.get(id)!.hasResigned) {
        clientFor(clients, id).send('swap', { indices: [] });
      }
    }
    await waitUntil(() => room.state.phase !== 'swap');
  }

  while (room.state.phase === 'playing') {
    const before = totalCardsInHands(room);
    playTurn(room, clients);
    await waitUntil(() => totalCardsInHands(room) < before || room.state.phase !== 'playing');
  }
}

describe('MuushigRoom — lobby', () => {
  test('assigns host, preserves seat order, and tracks player count', async () => {
    const room = await createRoom();
    const c1 = await colyseus.connectTo(room, { username: 'A' });
    const c2 = await colyseus.connectTo(room, { username: 'B' });
    await waitUntil(() => room.state.players.size === 2);

    expect(room.state.hostId).toBe(c1.sessionId);
    expect([...room.state.seatOrder]).toEqual([c1.sessionId, c2.sessionId]);
    expect(room.metadata.playerCount).toBe(2);
  });

  test('rejects joins beyond maxPlayers', async () => {
    const room = await createRoom({ maxPlayers: 2 });
    await colyseus.connectTo(room);
    await colyseus.connectTo(room);
    await expect(colyseus.connectTo(room)).rejects.toBeTruthy();
  });

  test('frees the seat and reassigns host when a player leaves the lobby', async () => {
    const room = await createRoom();
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    await waitUntil(() => room.state.players.size === 2);

    await c1.leave();
    await waitUntil(() => room.state.players.size === 1);
    expect(room.state.hostId).toBe(c2.sessionId);
  });
});

describe('MuushigRoom — start & deal', () => {
  test('host start deals 5 cards each, turns up a trump, and enters the decision phase', async () => {
    const room = await createRoom();
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    await waitUntil(() => room.state.players.size === 2);

    c1.send('ready');
    c2.send('ready');
    await waitUntil(() =>
      [...room.state.seatOrder].every((id) => room.state.players.get(id)!.isReady),
    );

    c1.send('start');
    await waitUntil(() => room.state.phase === 'decision');

    for (const id of [...room.state.seatOrder]) {
      expect(room.state.players.get(id)!.hand.length).toBe(HAND_SIZE);
    }
    expect(room.state.trumpSuit).not.toBe('');
    expect(room.state.trumpSuit).toBe(room.state.trumpCard.suit);
  });

  test('a non-host cannot start the game', async () => {
    const room = await createRoom();
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    await waitUntil(() => room.state.players.size === 2);
    c1.send('ready');
    c2.send('ready');
    await waitUntil(() =>
      [...room.state.seatOrder].every((id) => room.state.players.get(id)!.isReady),
    );

    c2.send('start'); // c2 is not host
    await new Promise((r) => setTimeout(r, 150));
    expect(room.state.phase).toBe('waiting');
  });

  test('rejects joining a game already in progress', async () => {
    const room = await createRoom();
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    await waitUntil(() => room.state.players.size === 2);
    c1.send('ready');
    c2.send('ready');
    await waitUntil(() =>
      [...room.state.seatOrder].every((id) => room.state.players.get(id)!.isReady),
    );
    c1.send('start');
    await waitUntil(() => room.state.phase !== 'waiting');

    await expect(colyseus.connectTo(room)).rejects.toBeTruthy();
  });
});

describe('MuushigRoom — round flow', () => {
  async function startedRoom(playerCount: number) {
    const room = await createRoom();
    const clients: AnyClient[] = [];
    for (let i = 0; i < playerCount; i++) clients.push(await colyseus.connectTo(room));
    await waitUntil(() => room.state.players.size === playerCount);
    for (const c of clients) c.send('ready');
    await waitUntil(() =>
      [...room.state.seatOrder].every((id) => room.state.players.get(id)!.isReady),
    );
    clients[0]!.send('start');
    await waitUntil(() => room.state.phase === 'decision');
    return { room, clients };
  }

  test('plays a full round and deals a fresh one when no one has won', async () => {
    const { room, clients } = await startedRoom(3);
    await playOneRound(room, clients);

    // No winner yet (scores start at 15) → a new round is dealt (back to decision).
    expect(room.state.phase).toBe('decision');
    expect(room.state.tricksPlayed).toBe(0);
    for (const id of [...room.state.seatOrder]) {
      expect(room.state.players.get(id)!.hand.length).toBe(HAND_SIZE);
    }
  });

  test('a resigning player sits out and the round still resolves', async () => {
    const { room, clients } = await startedRoom(3);

    // Decision phase: decisions go in seat order (clockwise from the amankhuzuu).
    // The last seat resigns, the others stay.
    clients[0]!.send('stay');
    clients[1]!.send('stay');
    clients[2]!.send('resign');
    await waitUntil(() => room.state.phase === 'swap');
    expect(room.state.players.get(clients[2]!.sessionId)!.hasResigned).toBe(true);

    // Stayers keep their cards, triggering the swap → play transition.
    clients[0]!.send('swap', { indices: [] });
    clients[1]!.send('swap', { indices: [] });
    await waitUntil(() => room.state.phase !== 'swap');

    while (room.state.phase === 'playing') {
      const before = totalCardsInHands(room);
      playTurn(room, clients);
      await waitUntil(() => totalCardsInHands(room) < before || room.state.phase !== 'playing');
    }
    expect(['decision', 'finished']).toContain(room.state.phase);
  });

  test('ends the game and broadcasts gameOver when a player reaches zero', async () => {
    const { room, clients } = await startedRoom(2);
    // Put both players one round away from winning.
    for (const id of [...room.state.seatOrder]) room.state.players.get(id)!.score = 3;

    let gameOver: { winners: string[] } | null = null;
    clients[0]!.onMessage('gameOver', (msg: { winners: string[] }) => {
      gameOver = msg;
    });

    await playOneRound(room, clients);

    expect(room.state.phase).toBe('finished');
    expect(room.state.winners.length).toBeGreaterThanOrEqual(1);
    await waitUntil(() => gameOver !== null);
    expect(gameOver!.winners.length).toBeGreaterThanOrEqual(1);
  });
});
