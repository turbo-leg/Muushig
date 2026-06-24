import { describe, test, expect } from 'vitest';
import { MuushigEngine, SHUT_OUT_PENALTY } from '../src/engine/MuushigEngine';
import { Suit, Rank } from '../src/state/Card';
import { c, buildPlayingState } from './helpers';

function roundState() {
  // Hands are irrelevant to scoring; we set tricksWon directly.
  return buildPlayingState(
    {
      a: [c(Suit.Hearts, Rank.Seven)],
      b: [c(Suit.Hearts, Rank.Eight)],
      cc: [c(Suit.Clubs, Rank.Nine)],
    },
    Suit.Spades,
  );
}

describe('scoreRound()', () => {
  test('lowers each score by tricks won and penalizes a shut-out player', () => {
    const state = roundState();
    state.players.get('a')!.tricksWon = 3;
    state.players.get('b')!.tricksWon = 2;
    state.players.get('cc')!.tricksWon = 0;

    const { deltas } = MuushigEngine.scoreRound(state);

    expect(deltas).toEqual({ a: -3, b: -2, cc: SHUT_OUT_PENALTY });
    expect(state.players.get('a')!.score).toBe(12);
    expect(state.players.get('b')!.score).toBe(13);
    expect(state.players.get('cc')!.score).toBe(20);
  });

  test('a resigned player is unaffected by scoring', () => {
    const state = roundState();
    state.players.get('cc')!.hasResigned = true; // took no tricks but resigned
    state.players.get('a')!.tricksWon = 5;

    const { deltas } = MuushigEngine.scoreRound(state);

    expect(deltas.cc).toBe(0);
    expect(state.players.get('cc')!.score).toBe(15); // unchanged, no +5
    expect(state.players.get('a')!.score).toBe(10);
  });

  test('reaching 0 or below records a winner and finishes the game', () => {
    const state = roundState();
    state.players.get('a')!.score = 2;
    state.players.get('a')!.tricksWon = 3; // 2 - 3 = -1
    state.players.get('b')!.tricksWon = 1;
    state.players.get('cc')!.tricksWon = 1;

    const { winners } = MuushigEngine.scoreRound(state);

    expect(winners).toEqual(['a']);
    expect([...state.winners]).toEqual(['a']);
    expect(state.phase).toBe('finished');
    expect(MuushigEngine.isGameOver(state)).toBe(true);
  });

  test('no winner leaves the game unfinished', () => {
    const state = roundState();
    state.players.get('a')!.tricksWon = 1;
    state.players.get('b')!.tricksWon = 1;
    state.players.get('cc')!.tricksWon = 3;

    MuushigEngine.scoreRound(state);
    expect(MuushigEngine.isGameOver(state)).toBe(false);
    expect(state.phase).toBe('playing');
  });
});
