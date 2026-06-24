import { describe, test, expect } from 'vitest';
import { MuushigEngine, HAND_SIZE, MAX_SWAP } from '../src/engine/MuushigEngine';
import { GameState } from '../src/state/GameState';
import { makeRng } from './helpers';

function dealtState(playerIds: string[], seed = 1): GameState {
  const state = new GameState();
  MuushigEngine.initializeGame(state, playerIds, makeRng(seed));
  return state;
}

describe('swapCards', () => {
  test('exchanges chosen cards, keeps hand size, and marks the player swapped', () => {
    const state = dealtState(['a', 'b', 'c', 'd', 'e']); // stock = 6
    const before = state.players.get('a')!.hand.map((card) => card.key);
    const stockBefore = state.stock.length;

    const exchanged = MuushigEngine.swapCards(state, 'a', [0, 1, 2]);

    const after = state.players.get('a')!.hand.map((card) => card.key);
    expect(exchanged).toBe(3);
    expect(after).toHaveLength(HAND_SIZE);
    expect(state.stock).toHaveLength(stockBefore - 3);
    expect(state.players.get('a')!.hasSwapped).toBe(true);
    // The three discarded cards are gone; the two untouched cards remain.
    expect(after.filter((k) => before.includes(k)).length).toBe(2);
  });

  test('caps the exchange at the stock size when stock is short', () => {
    const state = dealtState(['a', 'b', 'c', 'd', 'e']); // stock = 6
    // Drain stock to 2 by giving b a big swap first.
    MuushigEngine.swapCards(state, 'b', [0, 1, 2, 3]); // stock 6 -> 2
    expect(state.stock).toHaveLength(2);

    const exchanged = MuushigEngine.swapCards(state, 'a', [0, 1, 2, 3, 4]);
    expect(exchanged).toBe(2); // only 2 left in stock
    expect(state.stock).toHaveLength(0);
    expect(state.players.get('a')!.hand).toHaveLength(HAND_SIZE);
  });

  test('caps the exchange at MAX_SWAP', () => {
    const state = dealtState(['a', 'b']); // big stock
    const exchanged = MuushigEngine.swapCards(state, 'a', [0, 1, 2, 3, 4, 4, 3]);
    expect(exchanged).toBeLessThanOrEqual(MAX_SWAP);
    expect(state.players.get('a')!.hand).toHaveLength(HAND_SIZE);
  });

  test('swapping zero cards is allowed and just marks the player swapped', () => {
    const state = dealtState(['a', 'b']);
    expect(MuushigEngine.swapCards(state, 'a', [])).toBe(0);
    expect(state.players.get('a')!.hasSwapped).toBe(true);
  });

  test('rejects swapping twice, after resigning, or outside the swap phase', () => {
    const state = dealtState(['a', 'b']);
    MuushigEngine.swapCards(state, 'a', [0]);
    expect(() => MuushigEngine.swapCards(state, 'a', [1])).toThrow();

    MuushigEngine.resign(state, 'b');
    expect(() => MuushigEngine.swapCards(state, 'b', [0])).toThrow();

    state.phase = 'playing';
    expect(() => MuushigEngine.swapCards(state, 'a', [0])).toThrow();
  });
});

describe('resign and phase transition', () => {
  test('resign marks the player out and only works in the swap phase', () => {
    const state = dealtState(['a', 'b', 'c']);
    MuushigEngine.resign(state, 'c');
    expect(state.players.get('c')!.hasResigned).toBe(true);
    expect(MuushigEngine.activePlayers(state)).toEqual(['a', 'b']);

    state.phase = 'playing';
    expect(() => MuushigEngine.resign(state, 'a')).toThrow();
  });

  test('allSwapsComplete is true once everyone has swapped or resigned', () => {
    const state = dealtState(['a', 'b', 'c']);
    expect(MuushigEngine.allSwapsComplete(state)).toBe(false);
    MuushigEngine.swapCards(state, 'a', [0]);
    MuushigEngine.resign(state, 'b');
    expect(MuushigEngine.allSwapsComplete(state)).toBe(false);
    MuushigEngine.swapCards(state, 'c', []);
    expect(MuushigEngine.allSwapsComplete(state)).toBe(true);
  });

  test('beginPlay makes the first active seat the leader and enters playing phase', () => {
    const state = dealtState(['a', 'b', 'c']);
    MuushigEngine.resign(state, 'a');
    MuushigEngine.beginPlay(state);
    expect(state.phase).toBe('playing');
    expect(state.leaderId).toBe('b');
    expect(state.currentTurn).toBe('b');
  });
});
