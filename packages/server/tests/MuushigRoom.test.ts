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
    roundEndPause: 0,
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

  // Stop on the round-end pause too (phase stays 'playing' with empty hands).
  while (room.state.phase === 'playing' && totalCardsInHands(room) > 0) {
    const before = totalCardsInHands(room);
    playTurn(room, clients);
    await waitUntil(() => totalCardsInHands(room) < before || room.state.phase !== 'playing');
  }
}

describe('MuushigRoom — bots', () => {
  test('host adds a bot and the bot plays a full round on its own', async () => {
    const room = await createRoom({ botDelay: 5 });
    const human = await colyseus.connectTo(room);
    await waitUntil(() => room.state.players.size === 1);

    human.send('addBot');
    await waitUntil(() => room.state.players.size === 2);
    const botId = [...room.state.seatOrder].find((id) => id.startsWith('bot-'))!;
    expect(room.state.players.get(botId)!.isBot).toBe(true);
    expect(room.state.players.get(botId)!.isReady).toBe(true);

    human.send('ready');
    await waitUntil(() => room.state.players.get(human.sessionId)!.isReady);
    human.send('start');
    await waitUntil(() => room.state.phase === 'decision');

    // Identity fields survive the deal (initializeGame keeps Player objects).
    expect(room.state.players.get(botId)!.isBot).toBe(true);
    expect(room.state.players.get(botId)!.username).not.toBe('');

    // Drive only the human; the bot must act for itself.
    await waitUntil(
      () => room.state.currentTurn === human.sessionId || room.state.phase !== 'decision',
    );
    if (room.state.phase === 'decision') human.send('stay');
    await waitUntil(() => room.state.phase !== 'decision');

    if (room.state.phase === 'swap') {
      const me = () => room.state.players.get(human.sessionId)!;
      await waitUntil(
        () =>
          (room.state.currentTurn === human.sessionId && !me().hasSwapped) ||
          room.state.phase !== 'swap',
      );
      if (room.state.phase === 'swap' && !me().hasSwapped) human.send('swap', { indices: [] });
      await waitUntil(() => room.state.phase !== 'swap');
    }

    while (room.state.phase === 'playing') {
      await waitUntil(
        () => room.state.currentTurn === human.sessionId || room.state.phase !== 'playing',
      );
      if (room.state.phase !== 'playing') break;
      const before = totalCardsInHands(room);
      playTurn(room, [human]);
      await waitUntil(() => totalCardsInHands(room) < before || room.state.phase !== 'playing');
    }

    // Round resolved: fresh deal (or a finished game) without the bot stalling.
    await waitUntil(() => room.state.phase === 'decision' || room.state.phase === 'finished');
  });

  test('a bot takes over an abandoned seat once the reconnection window expires', async () => {
    const { room, clients } = await startedRoom(2, { reconnectWindow: 1, botDelay: 5 });
    const human = clients[0]!;
    const dropped = clients[1]!;
    const droppedId = dropped.sessionId;

    await dropped.leave(false);
    await waitUntil(() => room.state.players.get(droppedId)?.isConnected === false, 6000);

    // Window (1s) expires → bot takeover.
    await waitUntil(() => room.state.players.get(droppedId)?.isBot === true, 8000);

    // The human decides; the bot seat then decides by itself.
    await waitUntil(() => room.state.currentTurn === human.sessionId);
    human.send('stay');
    await waitUntil(() => room.state.players.get(droppedId)?.hasDecided === true, 8000);
    await waitUntil(() => room.state.phase === 'swap', 8000);
  });
});

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

  test('seats a mid-game joiner as a spectator, not a player', async () => {
    const { room } = await startedRoom(2);

    const watcher = await colyseus.connectTo(room, { username: 'Watcher' });
    await waitUntil(() => room.state.spectators.size === 1);

    expect(room.state.players.has(watcher.sessionId)).toBe(false);
    expect([...room.state.seatOrder]).not.toContain(watcher.sessionId);
    expect(room.state.spectators.get(watcher.sessionId)).toBe('Watcher');

    // Spectators can leave freely without holding a seat.
    await watcher.leave();
    await waitUntil(() => room.state.spectators.size === 0);
  });

  test('promotes spectators to seats when a rematch returns to the lobby', async () => {
    const { room, clients } = await startedRoom(2);
    // End the game quickly: both one trick from winning.
    for (const id of [...room.state.seatOrder]) room.state.players.get(id)!.score = 1;

    const watcher = await colyseus.connectTo(room, { username: 'Watcher' });
    await waitUntil(() => room.state.spectators.size === 1);

    await playOneRound(room, clients);
    await waitUntil(() => room.state.phase === 'finished');

    for (const c of clients) c.send('rematch');
    await waitUntil(() => room.state.phase === 'waiting');

    expect(room.state.players.has(watcher.sessionId)).toBe(true);
    expect([...room.state.seatOrder]).toContain(watcher.sessionId);
    expect(room.state.spectators.size).toBe(0);
    expect(room.state.players.get(watcher.sessionId)!.username).toBe('Watcher');
  });
});

async function startedRoom(playerCount: number, options: Record<string, unknown> = {}) {
  const room = await createRoom(options);
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

describe('MuushigRoom — round flow', () => {
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

  test('holds the seat when a player drops mid-game and restores it on reconnect', async () => {
    const { room, clients } = await startedRoom(2);
    const dropped = clients[1]!;
    const droppedId = dropped.sessionId;
    const token = dropped.reconnectionToken;

    await dropped.leave(false); // unconsented — simulates a network drop
    await waitUntil(() => room.state.players.get(droppedId)?.isConnected === false);

    // Seat is held, not freed.
    expect(room.state.players.has(droppedId)).toBe(true);
    expect([...room.state.seatOrder]).toContain(droppedId);
    expect(room.state.phase).toBe('decision');

    const rejoined = await colyseus.sdk.reconnect(token);
    expect(rejoined.sessionId).toBe(droppedId);
    await waitUntil(() => room.state.players.get(droppedId)?.isConnected === true);
  });

  test('an expired reconnection window keeps the seat playing via timers', async () => {
    // 1-second reconnection window; decision timer auto-stays after 300ms.
    const { room, clients } = await startedRoom(2, {
      reconnectWindow: 1,
      decisionTimeLimit: 300,
    });
    const dropped = clients[1]!;
    const droppedId = dropped.sessionId;

    await dropped.leave(false);
    await waitUntil(() => room.state.players.get(droppedId)?.isConnected === false);

    // The window lapses without a reconnect: the seat stays in the game,
    // stays disconnected, and the decision timer keeps the round moving.
    await waitUntil(() => room.state.players.get(droppedId)?.hasDecided === true, 6000);
    expect(room.state.players.has(droppedId)).toBe(true);
    expect(room.state.players.get(droppedId)!.isConnected).toBe(false);
    expect(room.state.phase).toBe('swap');
  });

  test('broadcasts roundEnd deltas and pauses before dealing the next round', async () => {
    const { room, clients } = await startedRoom(2, { roundEndPause: 250 });

    let roundEnd: { deltas: Record<string, number> } | null = null;
    clients[0]!.onMessage('roundEnd', (msg: { deltas: Record<string, number> }) => {
      roundEnd = msg;
    });

    await playOneRound(room, clients);

    // Scores are applied and announced while the deal is still held back.
    await waitUntil(() => roundEnd !== null);
    expect(Object.keys(roundEnd!.deltas).sort()).toEqual([...room.state.seatOrder].slice().sort());
    expect(room.state.phase).toBe('playing'); // paused — not yet re-dealt

    // …then the next round arrives on its own.
    await waitUntil(() => room.state.phase === 'decision', 4000);
    expect(room.state.tricksPlayed).toBe(0);
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
