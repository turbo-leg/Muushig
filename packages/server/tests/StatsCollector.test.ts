import { describe, test, expect } from 'vitest';
import { GameState, Player, HAND_SIZE, MAX_CONSECUTIVE_FOLDS } from '@muushig/shared';
import { StatsCollector, type SeatIdentity } from '../src/stats/StatsCollector';

function buildState(seatIds: string[]): GameState {
  const state = new GameState();
  for (const id of seatIds) {
    const p = new Player(id);
    p.username = id.toUpperCase();
    state.players.set(id, p);
    state.seatOrder.push(id);
  }
  return state;
}

const seat = (seatId: string, over: Partial<SeatIdentity> = {}): SeatIdentity => ({
  seatId,
  username: seatId.toUpperCase(),
  userId: `uuid-${seatId}`,
  isBot: false,
  ...over,
});

/** Sets one seat's per-round outcome on the live state before recordRound. */
function setRound(
  state: GameState,
  seatId: string,
  o: { stayed: boolean; tricks?: number; scoreAfter?: number },
): void {
  const p = state.players.get(seatId)!;
  p.hasResigned = !o.stayed;
  p.tricksWon = o.tricks ?? 0;
  if (o.scoreAfter !== undefined) p.score = o.scoreAfter;
}

describe('StatsCollector — rounds', () => {
  test('records stays, folds, shut-outs, and navshih (dealer only)', () => {
    const state = buildState(['a', 'b', 'c']);
    const collector = new StatsCollector();
    collector.begin([seat('a'), seat('b'), seat('c')], 0);

    state.dealerId = 'c';
    state.trumpExchanged = true; // c used navshih
    setRound(state, 'a', { stayed: true, tricks: 5, scoreAfter: 10 });
    setRound(state, 'b', { stayed: true, tricks: 0, scoreAfter: 20 }); // muushig'd
    setRound(state, 'c', { stayed: false, scoreAfter: 15 });
    collector.recordRound(state);

    const record = collector.finish(state, 60_000)!;
    const rows = record.rounds;
    expect(rows).toHaveLength(3);

    const a = rows.find((r) => r.seatId === 'a')!;
    expect(a).toMatchObject({ stayed: true, tricksWon: 5, shutOut: false, navshihUsed: false });

    const b = rows.find((r) => r.seatId === 'b')!;
    expect(b).toMatchObject({ stayed: true, tricksWon: 0, shutOut: true });

    // c folded: no navshih credit even as dealer with trumpExchanged set.
    const c = rows.find((r) => r.seatId === 'c')!;
    expect(c).toMatchObject({ stayed: false, tricksWon: 0, shutOut: false, navshihUsed: false });

    // Aggregates: a inflicted b's shut-out; b took one; a had a perfect round.
    const pa = record.players.find((p) => p.seatId === 'a')!;
    const pb = record.players.find((p) => p.seatId === 'b')!;
    expect(pa.stats.shutoutsInflicted).toBe(1);
    expect(pa.stats.perfectRounds).toBe(1);
    expect(pb.stats.shutoutsTaken).toBe(1);
    expect(record.durationSeconds).toBe(60);
  });

  test('navshih is credited to a staying dealer', () => {
    const state = buildState(['a', 'b']);
    const collector = new StatsCollector();
    collector.begin([seat('a'), seat('b')], 0);

    state.dealerId = 'a';
    state.trumpExchanged = true;
    setRound(state, 'a', { stayed: true, tricks: 3 });
    setRound(state, 'b', { stayed: true, tricks: 2 });
    collector.recordRound(state);

    const record = collector.finish(state, 0)!;
    expect(record.rounds.find((r) => r.seatId === 'a')!.navshihUsed).toBe(true);
    expect(record.rounds.find((r) => r.seatId === 'b')!.navshihUsed).toBe(false);
    expect(record.players.find((p) => p.seatId === 'a')!.stats.navshih).toBe(1);
  });

  test('flags a stay as haranhui-forced after the fold cap', () => {
    const state = buildState(['a', 'b']);
    const collector = new StatsCollector();
    collector.begin([seat('a'), seat('b')], 0);

    for (let i = 0; i < MAX_CONSECUTIVE_FOLDS; i++) {
      setRound(state, 'a', { stayed: false });
      setRound(state, 'b', { stayed: true, tricks: HAND_SIZE });
      collector.recordRound(state);
    }
    // Fourth round: a must play now.
    setRound(state, 'a', { stayed: true, tricks: 1 });
    setRound(state, 'b', { stayed: true, tricks: 4 });
    collector.recordRound(state);

    const record = collector.finish(state, 0)!;
    const aRows = record.rounds.filter((r) => r.seatId === 'a');
    expect(aRows.map((r) => r.haranhuiForced)).toEqual([false, false, false, true]);
    const pa = record.players.find((p) => p.seatId === 'a')!;
    expect(pa.stats).toMatchObject({ roundsFolded: 3, roundsStayed: 1, haranhuiForced: 1 });
    expect(record.roundsPlayed).toBe(4);
  });
});

describe('StatsCollector — finish', () => {
  test('placement ranks by final score and winners flag from state.winners', () => {
    const state = buildState(['a', 'b', 'c']);
    const collector = new StatsCollector();
    collector.begin([seat('a'), seat('b'), seat('c')], 0);

    setRound(state, 'a', { stayed: true, tricks: 2, scoreAfter: -1 });
    setRound(state, 'b', { stayed: true, tricks: 2, scoreAfter: 4 });
    setRound(state, 'c', { stayed: true, tricks: 1, scoreAfter: 9 });
    collector.recordRound(state);
    state.winners.push('a');

    const record = collector.finish(state, 0)!;
    const byId = new Map(record.players.map((p) => [p.seatId, p]));
    expect(byId.get('a')).toMatchObject({ won: true, placement: 1, score: -1 });
    expect(byId.get('b')).toMatchObject({ won: false, placement: 2 });
    expect(byId.get('c')).toMatchObject({ won: false, placement: 3 });
    expect(byId.get('a')!.opponents.sort()).toEqual(['B', 'C']);
  });

  test('finish is one-shot and begin() re-arms (rematch safety)', () => {
    const state = buildState(['a', 'b']);
    const collector = new StatsCollector();
    collector.begin([seat('a'), seat('b')], 0);
    setRound(state, 'a', { stayed: true, tricks: 5 });
    setRound(state, 'b', { stayed: true, tricks: 0 });
    collector.recordRound(state);

    expect(collector.finish(state, 0)).not.toBeNull();
    expect(collector.finish(state, 0)).toBeNull(); // one-shot
    collector.recordRound(state); // ignored while inactive
    expect(collector.finish(state, 0)).toBeNull();

    collector.begin([seat('a'), seat('b')], 0); // rematch
    collector.recordRound(state);
    expect(collector.finish(state, 0)!.roundsPlayed).toBe(1);
  });

  test('lobby bots set withBots; identities keep null userId for bots', () => {
    const state = buildState(['a', 'bot-1']);
    const collector = new StatsCollector();
    collector.begin([seat('a'), seat('bot-1', { userId: null, isBot: true })], 0);
    setRound(state, 'a', { stayed: true, tricks: 5 });
    setRound(state, 'bot-1', { stayed: true, tricks: 0 });
    collector.recordRound(state);

    const record = collector.finish(state, 0)!;
    expect(record.withBots).toBe(true);
    expect(record.players.find((p) => p.seatId === 'bot-1')!.userId).toBeNull();
  });

  test('abort() drops the match entirely', () => {
    const state = buildState(['a', 'b']);
    const collector = new StatsCollector();
    collector.begin([seat('a'), seat('b')], 0);
    collector.recordRound(state);
    collector.abort();
    expect(collector.finish(state, 0)).toBeNull();
  });
});
