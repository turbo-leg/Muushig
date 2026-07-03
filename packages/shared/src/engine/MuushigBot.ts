import { Card } from '../state/Card';
import { GameState } from '../state/GameState';
import { TrickPlay } from '../state/TrickPlay';
import { MuushigEngine, MAX_SWAP, MAX_CONSECUTIVE_FOLDS } from './MuushigEngine';

/**
 * Deterministic rules-based bot built on {@link MuushigEngine}. Like the
 * engine it is pure and I/O-free: each chooser reads the {@link GameState}
 * and returns an intent, so the server (or a client) decides when to act.
 *
 * Heuristics, not strategy: bid on trumps and honours, discard low off-suit
 * cards, win tricks as cheaply as possible (every trick taken is a point off
 * your score, and taking none costs the shut-out penalty).
 */
export class MuushigBot {
  /**
   * Hand strength for the stay/fold decision. Trumps dominate (any trump can
   * take a trick); off-suit cards only count from Jack up.
   */
  static handStrength(hand: Card[], trumpSuit: string): number {
    return hand.reduce((sum, c) => {
      if (c.suit === trumpSuit) return sum + c.rank + 10; // trump 7 → 17 … A → 24
      return sum + Math.max(0, c.rank - 10); // J=1 Q=2 K=3 A=4
    }, 0);
  }

  /** Minimum {@link handStrength} at which the bot bids (one trump is enough). */
  static readonly STAY_THRESHOLD = 14;

  /** Pre-round decision: bid (true) or fold. Respects the haranhui fold cap. */
  static chooseStay(state: GameState, playerId: string): boolean {
    const player = state.players.get(playerId);
    if (!player) return true;
    if (player.consecutiveFolds >= MAX_CONSECUTIVE_FOLDS) return true;
    const hand = [...player.hand] as Card[];
    return MuushigBot.handStrength(hand, state.trumpSuit) >= MuushigBot.STAY_THRESHOLD;
  }

  /**
   * Hand indices to discard in the swap phase: low off-suit cards (below King),
   * worst first, capped by both {@link MAX_SWAP} and what the stock can supply.
   */
  static chooseSwapIndices(state: GameState, playerId: string): number[] {
    const player = state.players.get(playerId);
    if (!player) return [];
    const budget = Math.min(MAX_SWAP, state.stock.length);
    return ([...player.hand] as Card[])
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.suit !== state.trumpSuit && card.rank < 13)
      .sort((a, b) => a.card.rank - b.card.rank)
      .slice(0, budget)
      .map(({ index }) => index);
  }

  /**
   * Card to throw on the bot's turn. Leads its highest card (tricks are pure
   * upside); otherwise wins as cheaply as possible, or sloughs its lowest.
   * Returns null when the bot has no hand (nothing to do).
   */
  static chooseCard(state: GameState, playerId: string): Card | null {
    const player = state.players.get(playerId);
    if (!player || player.hand.length === 0) return null;

    const legal = MuushigEngine.legalMoves(
      [...player.hand] as Card[],
      [...state.currentTrick] as TrickPlay[],
      state.ledSuit,
      state.trumpSuit,
    );
    if (legal.length === 0) return null;
    const byRank = [...legal].sort((a, b) => a.rank - b.rank);

    if (state.currentTrick.length === 0) return byRank[byRank.length - 1]!;

    const best = MuushigEngine.currentBestCard(
      [...state.currentTrick] as TrickPlay[],
      state.ledSuit,
      state.trumpSuit,
    )!;
    const cheapestWinner = byRank.find((c) =>
      MuushigEngine.beats(c, best, state.ledSuit, state.trumpSuit),
    );
    return cheapestWinner ?? byRank[0]!;
  }
}
