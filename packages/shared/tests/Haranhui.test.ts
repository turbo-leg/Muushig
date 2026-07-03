import { describe, test, expect } from 'vitest';
import { MuushigEngine, MAX_CONSECUTIVE_FOLDS } from '../src/engine/MuushigEngine';
import { Player, STARTING_SCORE } from '../src/state/Player';
import { GameState } from '../src/state/GameState';

function decisionState(ids: string[]): GameState {
  const state = new GameState();
  for (const id of ids) {
    const p = new Player(id);
    p.score = STARTING_SCORE;
    state.players.set(id, p);
    state.seatOrder.push(id);
  }
  state.phase = 'decision';
  state.currentTurn = ids[0]!;
  return state;
}

describe('haranhui oroh — consecutive-fold cap', () => {
  test('folding extends the streak; playing resets it', () => {
    const s = decisionState(['a', 'b']);
    const a = s.players.get('a')!;

    MuushigEngine.decide(s, 'a', false);
    expect(a.consecutiveFolds).toBe(1);

    a.hasDecided = false; // next round
    MuushigEngine.decide(s, 'a', true);
    expect(a.consecutiveFolds).toBe(0);
  });

  test(`cannot fold after ${MAX_CONSECUTIVE_FOLDS} in a row — must play`, () => {
    const s = decisionState(['a', 'b']);
    const a = s.players.get('a')!;
    a.consecutiveFolds = MAX_CONSECUTIVE_FOLDS; // already folded the cap

    expect(() => MuushigEngine.decide(s, 'a', false)).toThrow(/haranhui/i);
    expect(a.hasDecided).toBe(false); // the rejected fold changed nothing

    // Playing is allowed and clears the streak.
    MuushigEngine.decide(s, 'a', true);
    expect(a.consecutiveFolds).toBe(0);
  });
});
