import { Card, Suit, Rank } from '../src/state/Card';
import { Player, STARTING_SCORE } from '../src/state/Player';
import { GameState } from '../src/state/GameState';

/** Deterministic PRNG (mulberry32) so shuffle/deal are reproducible in tests. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Concise card constructor for tests, e.g. c(Suit.Hearts, Rank.Ace). */
export function c(suit: Suit, rank: Rank): Card {
  return new Card(suit, rank);
}

/**
 * Builds a GameState already in the `playing` phase with the given hands and
 * trump suit, so trick/scoring logic can be tested with fully controlled cards.
 * Seat order follows the insertion order of `hands`.
 */
export function buildPlayingState(hands: Record<string, Card[]>, trumpSuit: Suit): GameState {
  const state = new GameState();
  const ids = Object.keys(hands);
  for (const id of ids) {
    const p = new Player(id);
    p.score = STARTING_SCORE;
    for (const card of hands[id]!) p.hand.push(card);
    state.players.set(id, p);
    state.seatOrder.push(id);
  }
  state.trumpSuit = trumpSuit;
  state.hostId = ids[0]!;
  state.leaderId = ids[0]!;
  state.currentTurn = ids[0]!;
  state.ledSuit = '';
  state.phase = 'playing';
  return state;
}
