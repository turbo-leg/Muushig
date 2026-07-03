import { describe, test, expect } from 'vitest';
import { computeEloUpdates, ELO_START, type RatedPlayer } from '../src/stats/elo';

const p = (userId: string, rating: number, won: boolean, ratingGames = 20): RatedPlayer => ({
  userId,
  rating,
  ratingGames,
  won,
});

describe('computeEloUpdates', () => {
  test('equal established players exchange exactly K/2 = 16 points', () => {
    const updates = computeEloUpdates([p('w', 1000, true), p('l', 1000, false)]);
    expect(updates.get('w')).toBe(1016);
    expect(updates.get('l')).toBe(984);
  });

  test('an upset win pays more than an expected win', () => {
    const upset = computeEloUpdates([p('under', 900, true), p('fav', 1100, false)]).get('under')!;
    const expected = computeEloUpdates([p('fav', 1100, true), p('under', 900, false)]).get('fav')!;
    expect(upset - 900).toBeGreaterThan(expected - 1100);
  });

  test('placement games move faster than established games', () => {
    const fresh = computeEloUpdates([p('a', ELO_START, true, 0), p('b', ELO_START, false, 0)]);
    const settled = computeEloUpdates([p('a', ELO_START, true, 50), p('b', ELO_START, false, 50)]);
    expect(fresh.get('a')! - ELO_START).toBeGreaterThan(settled.get('a')! - ELO_START);
  });

  test('multiplayer: each is measured against the average of the others', () => {
    const updates = computeEloUpdates([
      p('winner', 1000, true),
      p('mid', 1100, false),
      p('low', 900, false),
    ]);
    // Winner faces avg(1100, 900) = 1000 — an even match → +16.
    expect(updates.get('winner')).toBe(1016);
    // Everyone gets an update.
    expect(updates.size).toBe(3);
    // The higher-rated loser bleeds more than the lower-rated one.
    expect(1100 - updates.get('mid')!).toBeGreaterThan(900 - updates.get('low')!);
  });

  test('multiple winners in one match all score 1', () => {
    const updates = computeEloUpdates([
      p('w1', 1000, true),
      p('w2', 1000, true),
      p('l', 1000, false),
    ]);
    expect(updates.get('w1')!).toBeGreaterThan(1000);
    expect(updates.get('w2')!).toBeGreaterThan(1000);
    expect(updates.get('l')!).toBeLessThan(1000);
  });

  test('fewer than 2 rated players is a no-op', () => {
    expect(computeEloUpdates([]).size).toBe(0);
    expect(computeEloUpdates([p('solo', 1000, true)]).size).toBe(0);
  });
});
