import { describe, test, expect } from 'vitest';
import { MuushigEngine, HAND_SIZE, MAX_SWAP } from '../src/engine/MuushigEngine';
import { GameState } from '../src/state/GameState';
import { makeRng } from './helpers';

/** Deal a round and advance to the swap phase with every player staying. */
function swapState(playerIds: string[], seed = 1): GameState {
  const state = new GameState();
  MuushigEngine.initializeGame(state, playerIds, makeRng(seed));
  for (const id of playerIds) MuushigEngine.decide(state, id, true);
  MuushigEngine.beginSwap(state);
  return state;
}

describe('decision phase', () => {
  test('decide records stay vs resign and only works in the decision phase', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b', 'c'], makeRng(1));
    expect(state.phase).toBe('decision');

    MuushigEngine.decide(state, 'a', true);
    MuushigEngine.decide(state, 'c', false);
    expect(state.players.get('a')!.hasDecided).toBe(true);
    expect(state.players.get('a')!.hasResigned).toBe(false);
    expect(state.players.get('c')!.hasResigned).toBe(true);

    state.phase = 'playing';
    expect(() => MuushigEngine.decide(state, 'b', true)).toThrow();
  });

  test('allDecided flips once every player has chosen', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b'], makeRng(1));
    expect(MuushigEngine.allDecided(state)).toBe(false);
    MuushigEngine.decide(state, 'a', true);
    expect(MuushigEngine.allDecided(state)).toBe(false);
    MuushigEngine.decide(state, 'b', false);
    expect(MuushigEngine.allDecided(state)).toBe(true);
  });

  test('beginSwap enters the swap phase and excludes resigned players', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b', 'c'], makeRng(1));
    MuushigEngine.decide(state, 'a', true);
    MuushigEngine.decide(state, 'b', true);
    MuushigEngine.decide(state, 'c', false);
    MuushigEngine.beginSwap(state);

    expect(state.phase).toBe('swap');
    expect(MuushigEngine.activePlayers(state)).toEqual(['a', 'b']);
    // A resigned player is pre-marked so they don't block swap completion.
    expect(state.players.get('c')!.hasSwapped).toBe(true);
  });
});

describe('swapCards', () => {
  test('exchanges chosen cards, keeps hand size, and marks the player swapped', () => {
    const state = swapState(['a', 'b', 'c', 'd', 'e']); // stock = 6
    const before = state.players.get('a')!.hand.map((card) => card.key);
    const stockBefore = state.stock.length;

    const exchanged = MuushigEngine.swapCards(state, 'a', [0, 1, 2]);

    const after = state.players.get('a')!.hand.map((card) => card.key);
    expect(exchanged).toBe(3);
    expect(after).toHaveLength(HAND_SIZE);
    expect(state.stock).toHaveLength(stockBefore - 3);
    expect(state.players.get('a')!.hasSwapped).toBe(true);
    expect(after.filter((k) => before.includes(k)).length).toBe(2);
  });

  test('rejects drawing more cards than remain in the stock', () => {
    const state = swapState(['a', 'b', 'c', 'd', 'e']); // stock = 6
    MuushigEngine.swapCards(state, 'b', [0, 1, 2, 3]); // stock 6 -> 2
    expect(state.stock).toHaveLength(2);

    // Asking for 5 when only 2 remain is not allowed — nothing changes.
    expect(() => MuushigEngine.swapCards(state, 'a', [0, 1, 2, 3, 4])).toThrow();
    expect(state.stock).toHaveLength(2);
    expect(state.players.get('a')!.hasSwapped).toBe(false);

    // Drawing exactly the 2 that remain is fine.
    const exchanged = MuushigEngine.swapCards(state, 'a', [0, 1]);
    expect(exchanged).toBe(2);
    expect(state.stock).toHaveLength(0);
    expect(state.players.get('a')!.hand).toHaveLength(HAND_SIZE);
  });

  test('caps the exchange at MAX_SWAP', () => {
    const state = swapState(['a', 'b']);
    const exchanged = MuushigEngine.swapCards(state, 'a', [0, 1, 2, 3, 4, 4, 3]);
    expect(exchanged).toBeLessThanOrEqual(MAX_SWAP);
    expect(state.players.get('a')!.hand).toHaveLength(HAND_SIZE);
  });

  test('swapping zero cards is allowed and just marks the player swapped', () => {
    const state = swapState(['a', 'b']);
    expect(MuushigEngine.swapCards(state, 'a', [])).toBe(0);
    expect(state.players.get('a')!.hasSwapped).toBe(true);
  });

  test('rejects swapping twice, a resigned player, or outside the swap phase', () => {
    const state = swapState(['a', 'b']);
    MuushigEngine.swapCards(state, 'a', [0]);
    expect(() => MuushigEngine.swapCards(state, 'a', [1])).toThrow();

    // A player who resigned in the decision phase cannot swap.
    const resignedState = new GameState();
    MuushigEngine.initializeGame(resignedState, ['a', 'b'], makeRng(2));
    MuushigEngine.decide(resignedState, 'a', true);
    MuushigEngine.decide(resignedState, 'b', false);
    MuushigEngine.beginSwap(resignedState);
    expect(() => MuushigEngine.swapCards(resignedState, 'b', [0])).toThrow();

    state.phase = 'playing';
    expect(() => MuushigEngine.swapCards(state, 'b', [0])).toThrow();
  });
});

describe('round roles: dealer & amankhuzuu', () => {
  test('dealer is the last seat; amankhuzuu is the dealer-left opener', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b', 'c'], makeRng(1));
    // The dealer deals to their left first and themselves last, so 'c' deals and
    // 'a' (to the dealer's left, the opener) is the amankhuzuu.
    expect(state.dealerId).toBe('c');
    expect(state.amankhuzuuId).toBe('a');
  });

  test('the amankhuzuu is fixed by seat and unaffected by who swaps', () => {
    const state = swapState(['a', 'b', 'c']);
    expect(state.amankhuzuuId).toBe('a');
    MuushigEngine.swapCards(state, 'c', [0, 1]); // someone else swapping first
    expect(state.amankhuzuuId).toBe('a'); // does not change the role
  });

  test('the dealer rotates one seat clockwise each round (amankhuzuu to their left)', () => {
    const state = swapState(['a', 'b', 'c']); // round 1: dealer last seat
    expect(state.dealerId).toBe('c');
    expect(state.amankhuzuuId).toBe('a');

    MuushigEngine.dealRound(state, makeRng(5)); // round 2
    expect(state.dealerId).toBe('a');
    expect(state.amankhuzuuId).toBe('b');

    MuushigEngine.dealRound(state, makeRng(6)); // round 3
    expect(state.dealerId).toBe('b');
    expect(state.amankhuzuuId).toBe('c');

    MuushigEngine.dealRound(state, makeRng(7)); // round 4 wraps back
    expect(state.dealerId).toBe('c');
    expect(state.amankhuzuuId).toBe('a');
  });
});

describe('exchangeTrump (dealer)', () => {
  test('dealer takes the trump card; the trump card and suit do not change', () => {
    const state = swapState(['a', 'b', 'c']); // dealer = 'c', now in the swap phase
    const dealer = state.players.get('c')!;
    const suitBefore = state.trumpSuit;
    const upBefore = state.trumpCard.key;
    const givenKey = dealer.hand[0]!.key;

    MuushigEngine.exchangeTrump(state, 'c', 0);

    expect(state.trumpSuit).toBe(suitBefore); // suit unchanged
    expect(state.trumpCard.key).toBe(upBefore); // the trump card itself is unchanged
    expect(dealer.hand.some((c) => c.key === upBefore)).toBe(true); // dealer took the trump card
    expect(dealer.hand.some((c) => c.key === givenKey)).toBe(false); // given card set aside
    expect(dealer.hand).toHaveLength(HAND_SIZE);
    expect(state.trumpExchanged).toBe(true);
  });

  test('only in the swap phase, only the dealer, and only once', () => {
    // Not allowed during the decision phase (before fold/play is done).
    const decisionState = new GameState();
    MuushigEngine.initializeGame(decisionState, ['a', 'b', 'c'], makeRng(1));
    expect(decisionState.phase).toBe('decision');
    expect(() => MuushigEngine.exchangeTrump(decisionState, 'c', 0)).toThrow();

    const state = swapState(['a', 'b', 'c']); // dealer = 'c', swap phase
    expect(() => MuushigEngine.exchangeTrump(state, 'a', 0)).toThrow(); // not the dealer
    MuushigEngine.exchangeTrump(state, 'c', 0);
    expect(() => MuushigEngine.exchangeTrump(state, 'c', 1)).toThrow(); // already exchanged

    state.trumpExchanged = false;
    state.phase = 'playing';
    expect(() => MuushigEngine.exchangeTrump(state, 'c', 0)).toThrow(); // too late
  });
});

describe('swap → play transition', () => {
  test('allSwapsComplete is true once every staying player has swapped', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b', 'c'], makeRng(1));
    MuushigEngine.decide(state, 'a', true);
    MuushigEngine.decide(state, 'b', false); // resigns
    MuushigEngine.decide(state, 'c', true);
    MuushigEngine.beginSwap(state);

    expect(MuushigEngine.allSwapsComplete(state)).toBe(false); // a, c still to swap
    MuushigEngine.swapCards(state, 'a', [0]);
    expect(MuushigEngine.allSwapsComplete(state)).toBe(false);
    MuushigEngine.swapCards(state, 'c', []);
    expect(MuushigEngine.allSwapsComplete(state)).toBe(true);
  });

  test('beginPlay makes the first active seat the leader and enters playing phase', () => {
    const state = new GameState();
    MuushigEngine.initializeGame(state, ['a', 'b', 'c'], makeRng(1));
    MuushigEngine.decide(state, 'a', false); // a resigns
    MuushigEngine.decide(state, 'b', true);
    MuushigEngine.decide(state, 'c', true);
    MuushigEngine.beginSwap(state);
    MuushigEngine.beginPlay(state);

    expect(state.phase).toBe('playing');
    expect(state.leaderId).toBe('b');
    expect(state.currentTurn).toBe('b');
  });
});
