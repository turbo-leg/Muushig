import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import { MuushigEngine, Card, HAND_SIZE } from '@muushig/shared';
import type { MatchRecord } from '../src/stats/StatsCollector';
import appConfig from '../app.config';

// Persistence is stubbed: magic tokens verify as fixed accounts (one premium,
// one not), anything else is a guest; supabaseAdmin=null keeps the default
// recorder disabled.
vi.mock('../src/lib/supabase', () => ({
  supabaseAdmin: null,
  verifyUser: async (token?: string) =>
    token === 'token-alice'
      ? { id: 'uuid-alice', username: 'Alice', avatarUrl: '' }
      : token === 'token-premium'
        ? { id: 'uuid-premium', username: 'Patron', avatarUrl: '' }
        : null,
  isPremium: async (userId: string) => userId === 'uuid-premium',
}));

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
    trickEndPause: 0,
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

describe('MuushigRoom — private tables & join codes', () => {
  test('privateTable rooms get a code on state and metadata, honoring a sanitized injected code', async () => {
    const room = await createRoom({
      privateTable: true,
      joinCode: 'ab#cd',
      accessToken: 'token-premium',
    });
    expect(room.state.joinCode).toBe('ABCD');
    expect(room.metadata.joinCode).toBe('ABCD');
    expect(room.listing.private).toBe(true);
  });

  test('generates a fresh code when the requested one is taken', async () => {
    await createRoom({ privateTable: true, joinCode: 'WXYZ', accessToken: 'token-premium' });
    const second = await createRoom({
      privateTable: true,
      joinCode: 'WXYZ',
      accessToken: 'token-premium',
    });
    expect(second.state.joinCode).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    expect(second.state.joinCode).not.toBe('WXYZ');
  });

  test('public rooms carry no code', async () => {
    const room = await createRoom();
    expect(room.state.joinCode).toBe('');
    expect(room.metadata.joinCode).toBeUndefined();
  });
});

describe('MuushigRoom — premium hosting gate', () => {
  test('guests and non-premium accounts cannot host custom or private tables', async () => {
    await expect(createRoom({ customTable: true })).rejects.toBeTruthy();
    await expect(
      createRoom({ customTable: true, accessToken: 'token-alice' }),
    ).rejects.toBeTruthy();
    await expect(
      createRoom({ privateTable: true, accessToken: 'token-alice' }),
    ).rejects.toBeTruthy();
  });

  test('a premium account hosts a named, browsable table', async () => {
    const room = await createRoom({
      customTable: true,
      tableName: 'Baatar’s den',
      accessToken: 'token-premium',
    });
    expect(room.metadata.tableName).toBe('Baatar’s den');
    expect(room.listing.private).toBe(false); // browsable
    expect(room.state.joinCode).toBe(''); // public — no code
  });

  test('plain quick-play rooms are created freely (no flags, no token)', async () => {
    const room = await createRoom();
    expect(room.metadata.tableName).toBeUndefined();
  });
});

describe('GET /api/lobbies', () => {
  test('lists public web tables with counts, hiding private ones', async () => {
    const pub = await createRoom({
      customTable: true,
      tableName: 'Open den',
      accessToken: 'token-premium',
    });
    await createRoom({ privateTable: true, joinCode: 'QRST', accessToken: 'token-premium' });
    await colyseus.connectTo(pub, { username: 'Host' });
    await waitUntil(() => pub.state.players.size === 1);

    const res = await colyseus.http.get('/api/lobbies');
    const lobbies = (res.data as { lobbies: Array<Record<string, unknown>> }).lobbies;
    const mine = lobbies.find((l) => l.roomId === pub.roomId)!;
    expect(mine).toMatchObject({
      name: 'Open den',
      host: 'Host',
      phase: 'waiting',
      playerCount: 1,
      maxPlayers: 5,
    });
    expect(lobbies.some((l) => l.name === undefined && l.joinCode)).toBe(false);
    expect(lobbies.every((l) => !('joinCode' in l))).toBe(true);
  });
});

describe('MuushigRoom — username moderation', () => {
  test('a profane join name is replaced with a tavern guest name', async () => {
    const room = await createRoom();
    const c = await colyseus.connectTo(room, { username: 'fucker99' });
    await waitUntil(() => room.state.players.size === 1);
    const name = room.state.players.get(c.sessionId)!.username;
    expect(name).not.toMatch(/fuck/i);
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });
});

describe('POST /api/client-error', () => {
  test('accepts a report and rate-limits floods', async () => {
    const payload = { message: 'boom', stack: 'at x', context: 'test', url: 'http://x' };
    const first = await colyseus.http.post('/api/client-error', { body: payload });
    expect(first.data).toMatchObject({ ok: true });

    // 10/minute per IP — the 11th in a burst is refused.
    let rejected = false;
    for (let i = 0; i < 12; i++) {
      try {
        await colyseus.http.post('/api/client-error', { body: payload });
      } catch {
        rejected = true;
      }
    }
    expect(rejected).toBe(true);
  });
});

describe('GET /api/table/:code', () => {
  test('resolves a live code to room info and 404s unknown codes', async () => {
    const room = await createRoom({
      privateTable: true,
      joinCode: 'FQRS',
      accessToken: 'token-premium',
    });
    await colyseus.connectTo(room, { username: 'Host' });
    await waitUntil(() => room.state.players.size === 1);

    const found = await colyseus.http.get('/api/table/fqrs'); // case-insensitive
    expect(found.data).toMatchObject({
      roomId: room.roomId,
      phase: 'waiting',
      playerCount: 1,
      maxPlayers: 5,
    });

    await expect(colyseus.http.get('/api/table/ZZZZ')).rejects.toBeTruthy();
    await expect(colyseus.http.get('/api/table/nope!')).rejects.toBeTruthy();
  });
});

describe('MuushigRoom — kick & leave', () => {
  test('host kicks a lobby player; the banned identity cannot rejoin', async () => {
    const room = await createRoom();
    const host = await colyseus.connectTo(room, { username: 'Host' });
    const alice = await colyseus.connectTo(room, { username: 'A', accessToken: 'token-alice' });
    await waitUntil(() => room.state.players.size === 2);

    let closeCode = 0;
    alice.onLeave((code: number) => {
      closeCode = code;
    });

    host.send('kick', { id: alice.sessionId });
    await waitUntil(() => room.state.players.size === 1);
    expect([...room.state.seatOrder]).toEqual([host.sessionId]);
    await waitUntil(() => closeCode !== 0);
    expect(closeCode).toBe(4001);

    // The same verified account is banned from this table.
    await expect(
      colyseus.connectTo(room, { username: 'A2', accessToken: 'token-alice' }),
    ).rejects.toBeTruthy();
  });

  test('non-hosts cannot kick, and bots are removed via removeBot instead', async () => {
    const room = await createRoom();
    const host = await colyseus.connectTo(room, { username: 'Host' });
    const guest = await colyseus.connectTo(room, { username: 'B' });
    await waitUntil(() => room.state.players.size === 2);

    guest.send('kick', { id: host.sessionId });
    await new Promise((r) => setTimeout(r, 150));
    expect(room.state.players.size).toBe(2);

    host.send('addBot');
    await waitUntil(() => room.state.players.size === 3);
    const botId = [...room.state.seatOrder].find((id) => id.startsWith('bot-'))!;
    host.send('kick', { id: botId });
    await new Promise((r) => setTimeout(r, 150));
    expect(room.state.players.has(botId)).toBe(true); // kick refuses bots
  });

  test('leaveTable mid-game skips the reconnection hold — instant bot takeover', async () => {
    const { room, clients } = await startedRoom(2, { botDelay: 5 });
    const leaver = clients[1]!;
    const leaverId = leaver.sessionId;

    leaver.send('leaveTable');
    await waitUntil(() => room.state.players.get(leaverId)?.isBot === true);
    expect(room.state.players.get(leaverId)!.isConnected).toBe(false);

    // The bot seat acts for itself once its turn comes.
    await waitUntil(() => room.state.currentTurn === clients[0]!.sessionId);
    clients[0]!.send('stay');
    await waitUntil(() => room.state.players.get(leaverId)?.hasDecided === true, 6000);
  });

  test('leaveTable in the lobby frees the seat entirely', async () => {
    const room = await createRoom();
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    await waitUntil(() => room.state.players.size === 2);

    c2.send('leaveTable');
    await waitUntil(() => room.state.players.size === 1);
    expect([...room.state.seatOrder]).toEqual([c1.sessionId]);
  });
});

describe('MuushigRoom — stats recording', () => {
  test('records a full match once, with identities, navshih, and rounds — and again after a rematch', async () => {
    const records: MatchRecord[] = [];
    const recorder = async (r: MatchRecord) => {
      records.push(r);
    };
    const room = await createRoom({ recorder });
    const alice = await colyseus.connectTo(room, { username: 'A', accessToken: 'token-alice' });
    const guest = await colyseus.connectTo(room, { username: 'B' });
    const clients = [alice, guest];
    await waitUntil(() => room.state.players.size === 2);

    for (const c of clients) c.send('ready');
    await waitUntil(() =>
      [...room.state.seatOrder].every((id) => room.state.players.get(id)!.isReady),
    );
    alice.send('start');
    await waitUntil(() => room.state.phase === 'decision');

    // One round from the finish line.
    for (const id of [...room.state.seatOrder]) room.state.players.get(id)!.score = 1;

    // Round 1: both stay; the dealer uses navshih; play out the tricks.
    for (const id of [...room.state.seatOrder]) clientFor(clients, id).send('stay');
    await waitUntil(() => room.state.phase === 'swap');
    const dealerId = room.state.dealerId;
    clientFor(clients, dealerId).send('exchangeTrump', { index: 0 });
    await waitUntil(() => room.state.trumpExchanged === true);
    for (const id of [...room.state.seatOrder])
      clientFor(clients, id).send('swap', { indices: [] });
    await waitUntil(() => room.state.phase === 'playing');
    while (room.state.phase === 'playing' && totalCardsInHands(room) > 0) {
      const before = totalCardsInHands(room);
      playTurn(room, clients);
      await waitUntil(() => totalCardsInHands(room) < before || room.state.phase !== 'playing');
    }
    await waitUntil(() => room.state.phase === 'finished');
    await waitUntil(() => records.length === 1);

    const rec = records[0]!;
    expect(rec.playerCount).toBe(2);
    expect(rec.withBots).toBe(false);
    expect(rec.roundsPlayed).toBe(1);
    expect(rec.rounds).toHaveLength(2);

    const pAlice = rec.players.find((p) => p.seatId === alice.sessionId)!;
    const pGuest = rec.players.find((p) => p.seatId === guest.sessionId)!;
    expect(pAlice.userId).toBe('uuid-alice'); // verified token
    expect(pGuest.userId).toBeNull(); // guest
    expect(pAlice.opponents).toEqual(['B']);

    // The dealer's round row carries the navshih.
    const dealerRow = rec.rounds.find((r) => r.seatId === dealerId)!;
    expect(dealerRow.navshihUsed).toBe(true);

    // Winner bookkeeping is internally consistent.
    const winners = rec.players.filter((p) => p.won);
    expect(winners.length).toBeGreaterThanOrEqual(1);
    expect(winners.some((p) => p.placement === 1)).toBe(true);
    for (const p of rec.players) {
      expect(p.stats.roundsStayed + p.stats.roundsFolded).toBe(1);
    }

    // ── Rematch: a second, separate record (no double-recording) ──
    for (const c of clients) c.send('rematch');
    await waitUntil(() => room.state.phase === 'waiting');
    expect(records).toHaveLength(1); // rematch reset alone records nothing

    // Age out the per-session rate-limit window before the next burst.
    await new Promise((r) => setTimeout(r, 1100));

    for (const c of clients) c.send('ready');
    await waitUntil(() =>
      [...room.state.seatOrder].every((id) => room.state.players.get(id)!.isReady),
    );
    alice.send('start');
    await waitUntil(() => room.state.phase === 'decision');
    for (const id of [...room.state.seatOrder]) room.state.players.get(id)!.score = 1;

    // Round 2 flavor: the second decider folds, the other plays it out alone.
    const [first, second] = [...room.state.seatOrder];
    clientFor(clients, first!).send('stay');
    await waitUntil(() => room.state.currentTurn === second);
    clientFor(clients, second!).send('resign');
    await waitUntil(() => room.state.phase !== 'decision');
    if (room.state.phase === 'swap') {
      clientFor(clients, first!).send('swap', { indices: [] });
      await waitUntil(() => room.state.phase !== 'swap');
    }
    while (room.state.phase === 'playing' && totalCardsInHands(room) > 0) {
      const before = totalCardsInHands(room);
      playTurn(room, clients);
      await waitUntil(() => totalCardsInHands(room) < before || room.state.phase !== 'playing');
    }
    await waitUntil(() => records.length === 2, 6000);

    const rec2 = records[1]!;
    const folded = rec2.players.find((p) => p.seatId === second)!;
    const stayer = rec2.players.find((p) => p.seatId === first)!;
    expect(folded.stats.roundsFolded).toBe(1);
    expect(stayer.stats.roundsStayed).toBe(1);
    expect(stayer.stats.tricks).toBe(HAND_SIZE); // played the round alone
    expect(stayer.stats.perfectRounds).toBe(1);
    expect(stayer.won).toBe(true);
  });
});

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

  test('holds a completed trick on display before resolving it, ignoring extra plays', async () => {
    const { room, clients } = await startedRoom(2, { trickEndPause: 250 });

    // Reach trick play with kept hands.
    for (const id of [...room.state.seatOrder]) clientFor(clients, id).send('stay');
    await waitUntil(() => room.state.phase === 'swap');
    for (const id of [...room.state.seatOrder])
      clientFor(clients, id).send('swap', { indices: [] });
    await waitUntil(() => room.state.phase === 'playing');

    // Play out the first trick (both seats).
    playTurn(room, clients);
    await waitUntil(() => room.state.currentTrick.length === 1);
    playTurn(room, clients);
    await waitUntil(() => room.state.currentTrick.length === 2);

    // The full trick stays face-up during the pause — nothing resolved yet.
    expect(room.state.tricksPlayed).toBe(0);
    expect(
      [...room.state.seatOrder].every((id) => room.state.players.get(id)!.tricksWon === 0),
    ).toBe(true);

    // A play during the display window is ignored (no 3rd card sneaks in).
    playTurn(room, clients);
    await new Promise((r) => setTimeout(r, 60));
    expect(room.state.currentTrick.length).toBe(2);

    // After the pause the trick is awarded and cleared.
    await waitUntil(() => room.state.currentTrick.length === 0, 4000);
    expect(room.state.tricksPlayed).toBe(1);
    expect(
      [...room.state.seatOrder].reduce((s, id) => s + room.state.players.get(id)!.tricksWon, 0),
    ).toBe(1);
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
