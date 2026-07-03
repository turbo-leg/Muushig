import { describe, test, expect } from 'vitest';
import { MuushigEngine, HAND_SIZE, STOCK_SIZE } from '../src/engine/MuushigEngine';
import { STARTING_SCORE } from '../src/state/Player';
import { GameState } from '../src/state/GameState';
import { makeRng } from './helpers';

describe('initializeGame', () => {
  test('rejects fewer than 2 or more than 5 players', () => {
    expect(() => MuushigEngine.initializeGame(new GameState(), ['a'], makeRng(1))).toThrow();
    expect(() =>
      MuushigEngine.initializeGame(new GameState(), ['a', 'b', 'c', 'd', 'e', 'f'], makeRng(1)),
    ).toThrow();
  });

  test('sets every score to 15 and records seat order + host', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b', 'c'], makeRng(1));

    expect([...state.seatOrder]).toEqual(['a', 'b', 'c']);
    expect(state.hostId).toBe('a');
    for (const id of ['a', 'b', 'c']) {
      expect(state.players.get(id)!.score).toBe(STARTING_SCORE);
    }
  });

  test('deals 5 cards each, turns up a trump, and opens in the decision phase', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b', 'c', 'd', 'e'], makeRng(99));

    for (const id of state.seatOrder) {
      expect(state.players.get(id)!.hand).toHaveLength(HAND_SIZE);
    }
    expect(state.trumpCard.suit).not.toBe('None');
    expect(state.trumpSuit).toBe(state.trumpCard.suit);
    expect(state.phase).toBe('decision');
    expect(state.currentTurn).toBe('a');
  });

  test('stock is always exactly 6 cards, regardless of player count', () => {
    for (const ids of [
      ['a', 'b'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c', 'd', 'e'],
    ]) {
      const state = new GameState();
      MuushigEngine.initializeGame(state, ids, makeRng(3));
      expect(state.stock).toHaveLength(STOCK_SIZE);
    }
  });

  test('dealt + trump + stock cards are all distinct (no card appears twice)', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b', 'c'], makeRng(123));

    const keys: string[] = [];
    for (const id of state.seatOrder) {
      for (const card of state.players.get(id)!.hand) keys.push(card.key);
    }
    keys.push(state.trumpCard.key);
    for (const card of state.stock) keys.push(card.key);

    // 3 players: 15 dealt + 1 trump + 6 stock = 22 cards in play, all unique.
    expect(keys).toHaveLength(3 * HAND_SIZE + 1 + STOCK_SIZE);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('initializeGame keeps existing Player objects and their identity fields', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b'], makeRng(7));
    const a = state.players.get('a')!;
    a.username = 'Alice';
    a.avatarUrl = 'ava.png';
    a.isBot = true;
    a.score = 3;
    a.scoreLog.push('12');
    a.consecutiveFolds = 2;

    // Rematch path: the same seats start a fresh game.
    MuushigEngine.initializeGame(state, ['a', 'b'], makeRng(8));

    const a2 = state.players.get('a')!;
    expect(a2).toBe(a); // same schema object, not a replacement
    expect(a2.username).toBe('Alice');
    expect(a2.avatarUrl).toBe('ava.png');
    expect(a2.isBot).toBe(true);
    // …while game progress is fully reset.
    expect(a2.score).toBe(STARTING_SCORE);
    expect([...a2.scoreLog]).toEqual([]);
    expect(a2.consecutiveFolds).toBe(0);
  });

  test('dealRound preserves cumulative scores across rounds', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b'], makeRng(5));
    state.players.get('a')!.score = 9;
    state.players.get('b')!.score = 12;

    MuushigEngine.dealRound(state, makeRng(6));

    expect(state.players.get('a')!.score).toBe(9);
    expect(state.players.get('b')!.score).toBe(12);
    expect(state.players.get('a')!.tricksWon).toBe(0);
    expect(state.players.get('a')!.hasResigned).toBe(false);
    expect(state.players.get('a')!.hasDecided).toBe(false);
    expect(state.phase).toBe('decision');
  });
});
