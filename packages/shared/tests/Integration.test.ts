import { describe, test, expect } from 'vitest';
import { MuushigEngine, HAND_SIZE } from '../src/engine/MuushigEngine';
import { Card } from '../src/state/Card';
import { TrickPlay } from '../src/state/TrickPlay';
import { GameState } from '../src/state/GameState';
import { makeRng } from './helpers';

/**
 * Plays a complete round by always choosing the first legal move for whoever is
 * on turn. This exercises deal → swap → all tricks → scoring as a whole and
 * asserts the engine never reaches an illegal or stuck state.
 */
describe('full round integration', () => {
  test.each([2, 3, 4, 5])('drives a complete %i-player round to scoring', (playerCount) => {
    const ids = ['a', 'b', 'c', 'd', 'e'].slice(0, playerCount);
    const state = new GameState();
    MuushigEngine.initializeGame(state, ids, makeRng(playerCount * 17 + 1));

    // Swap phase: everyone keeps their cards (swap zero), then begin play.
    for (const id of ids) MuushigEngine.swapCards(state, id, []);
    expect(MuushigEngine.allSwapsComplete(state)).toBe(true);
    MuushigEngine.beginPlay(state);

    let safety = 0;
    while (!MuushigEngine.isRoundComplete(state)) {
      if (++safety > 1000) throw new Error('round did not terminate');

      const turnId = state.currentTurn;
      const hand = [...state.players.get(turnId)!.hand] as Card[];
      const legal = MuushigEngine.legalMoves(
        hand,
        [...state.currentTrick] as TrickPlay[],
        state.ledSuit,
        state.trumpSuit,
      );
      MuushigEngine.playCard(state, turnId, legal[0]!);

      if (MuushigEngine.isTrickComplete(state)) {
        MuushigEngine.resolveTrick(state);
      }
    }

    // Exactly HAND_SIZE tricks were played and every card has been used.
    expect(state.tricksPlayed).toBe(HAND_SIZE);
    const totalTricks = ids.reduce((sum, id) => sum + state.players.get(id)!.tricksWon, 0);
    expect(totalTricks).toBe(HAND_SIZE);
    for (const id of ids) expect(state.players.get(id)!.hand).toHaveLength(0);

    // Scoring applies cleanly.
    const before = ids.map((id) => state.players.get(id)!.score);
    MuushigEngine.scoreRound(state);
    const after = ids.map((id) => state.players.get(id)!.score);
    expect(after).not.toEqual(undefined);
    // Total score change equals -(tricks) + 5*(shut-out players).
    const shutOuts = ids.filter((id) => state.players.get(id)!.tricksWon === 0).length;
    const totalDelta = after.reduce((s, v) => s + v, 0) - before.reduce((s, v) => s + v, 0);
    expect(totalDelta).toBe(-HAND_SIZE + 5 * shutOuts);
  });
});
