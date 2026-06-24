import { describe, test, expect } from 'vitest';
import { MuushigEngine, HAND_SIZE } from '../src/engine/MuushigEngine';
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

  test('deals 5 cards each, turns up a trump, and opens in swap phase', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b', 'c', 'd', 'e'], makeRng(99));

    for (const id of state.seatOrder) {
      expect(state.players.get(id)!.hand).toHaveLength(HAND_SIZE);
    }
    expect(state.trumpCard.suit).not.toBe('None');
    expect(state.trumpSuit).toBe(state.trumpCard.suit);
    expect(state.phase).toBe('swap');
    expect(state.currentTurn).toBe('a');
  });

  test('stock holds the remaining cards (exactly 6 with five players)', () => {
    const five = new GameState();
    MuushigEngine.initializeGame(five, ['a', 'b', 'c', 'd', 'e'], makeRng(3));
    expect(five.stock).toHaveLength(6); // 32 - 25 dealt - 1 trump

    const three = new GameState();
    MuushigEngine.initializeGame(three, ['a', 'b', 'c'], makeRng(3));
    expect(three.stock).toHaveLength(32 - 3 * HAND_SIZE - 1);
  });

  test('every dealt + trump + stock card is unique (conservation)', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b', 'c', 'd', 'e'], makeRng(123));

    const keys: string[] = [];
    for (const id of state.seatOrder) {
      for (const card of state.players.get(id)!.hand) keys.push(card.key);
    }
    keys.push(state.trumpCard.key);
    for (const card of state.stock) keys.push(card.key);

    expect(keys).toHaveLength(32);
    expect(new Set(keys).size).toBe(32);
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
    expect(state.phase).toBe('swap');
  });
});
