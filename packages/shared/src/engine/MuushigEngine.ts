import { Card, Suit, ALL_SUITS, ALL_RANKS } from '../state/Card';
import { Player, STARTING_SCORE } from '../state/Player';
import { TrickPlay } from '../state/TrickPlay';
import { GameState } from '../state/GameState';

/** Cards dealt to each player. */
export const HAND_SIZE = 5;
/** Maximum cards a player may exchange during the swap phase. */
export const MAX_SWAP = 5;
/** Penalty added to a player's score for taking zero tricks in a round. */
export const SHUT_OUT_PENALTY = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;

/** Injectable random source so shuffling is deterministic in tests. */
export type RNG = () => number;

export interface TrickResult {
  winnerId: string;
  winningCard: Card;
}

export interface RoundScore {
  /** seat id -> point delta applied this round (negative lowers the score). */
  deltas: Record<string, number>;
  /** seat ids who reached 0 or below and have won the game. */
  winners: string[];
}

/**
 * Pure, deterministic rules engine for Muushig (Муушиг).
 *
 * All methods are static and free of I/O and wall-clock time; randomness is
 * injected via an {@link RNG}. The engine reads and mutates {@link GameState}
 * but never performs networking, so it is identical on server and client and
 * fully unit-testable. See GAME_RULES.md for the ruleset and open questions.
 */
export class MuushigEngine {
  // ──────────────────────────── Deck ────────────────────────────

  /** Builds the standard 32-card Muushig deck (7..A in four suits). */
  static createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of ALL_SUITS) {
      for (const rank of ALL_RANKS) {
        deck.push(new Card(suit, rank));
      }
    }
    return deck;
  }

  /** Fisher–Yates shuffle, in place, using the injected RNG. Returns the deck. */
  static shuffleDeck(deck: Card[], rng: RNG = Math.random): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
    return deck;
  }

  // ──────────────────────────── Setup ────────────────────────────

  /**
   * Initializes a brand-new game: registers players, sets every score to the
   * starting value, and deals the first round.
   */
  static initializeGame(state: GameState, playerIds: string[], rng: RNG = Math.random): void {
    if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) {
      throw new Error(`Muushig requires ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
    }

    state.players.clear();
    state.seatOrder.splice(0, state.seatOrder.length);

    for (const id of playerIds) {
      const p = new Player(id);
      p.score = STARTING_SCORE;
      state.players.set(id, p);
      state.seatOrder.push(id);
    }
    state.hostId = playerIds[0]!;
    state.maxPlayers = MAX_PLAYERS;
    state.winners.splice(0, state.winners.length);

    MuushigEngine.dealRound(state, rng);
  }

  /**
   * Deals a fresh round, preserving cumulative scores. Resets per-round state,
   * deals {@link HAND_SIZE} cards each, turns up the trump card, and puts the
   * remainder into the stock. Round opens in the `swap` phase.
   */
  static dealRound(state: GameState, rng: RNG = Math.random): void {
    const deck = MuushigEngine.shuffleDeck(MuushigEngine.createDeck(), rng);

    // Reset per-round player state.
    for (const id of state.seatOrder) {
      const p = state.players.get(id)!;
      p.hand.splice(0, p.hand.length);
      p.tricksWon = 0;
      p.hasSwapped = false;
      p.hasResigned = false;
    }

    // Deal HAND_SIZE cards to each seat in turn.
    for (let i = 0; i < HAND_SIZE; i++) {
      for (const id of state.seatOrder) {
        state.players.get(id)!.hand.push(deck.pop()!);
      }
    }

    // Turn up the trump card; its suit is trump for the round.
    const trump = deck.pop()!;
    state.trumpCard = trump;
    state.trumpSuit = trump.suit;

    // Remainder is the face-down stock.
    state.stock.splice(0, state.stock.length);
    state.stock.push(...deck);

    // Reset trick/turn bookkeeping.
    state.currentTrick.splice(0, state.currentTrick.length);
    state.ledSuit = '';
    state.tricksPlayed = 0;
    state.leaderId = state.seatOrder[0]!;
    state.currentTurn = state.seatOrder[0]!;
    state.phase = 'swap';
  }

  // ──────────────────────────── Swap phase ────────────────────────────

  /**
   * Replaces up to {@link MAX_SWAP} of a player's cards with cards drawn from
   * the stock. If the stock holds fewer cards than requested, only that many
   * are exchanged (the rest of the chosen cards stay in hand). Marks the player
   * as having taken their swap.
   *
   * @param handIndices indices into the player's hand to discard & redraw.
   * @returns the number of cards actually exchanged.
   */
  static swapCards(state: GameState, playerId: string, handIndices: number[]): number {
    if (state.phase !== 'swap') throw new Error('Swaps are only allowed in the swap phase');
    const player = state.players.get(playerId);
    if (!player) throw new Error(`Unknown player ${playerId}`);
    if (player.hasResigned) throw new Error('Resigned players cannot swap');
    if (player.hasSwapped) throw new Error('Player has already swapped this round');

    // Unique, in-range indices, capped at MAX_SWAP and at the stock size.
    const unique = [...new Set(handIndices)].filter((i) => i >= 0 && i < player.hand.length);
    const count = Math.min(unique.length, MAX_SWAP, state.stock.length);
    const chosen = unique.slice(0, count).sort((a, b) => b - a); // desc for safe splicing

    for (const idx of chosen) {
      player.hand.splice(idx, 1);
    }
    for (let i = 0; i < count; i++) {
      player.hand.push(state.stock.shift()!);
    }

    player.hasSwapped = true;
    return count;
  }

  /**
   * Resigns a player before the round is played, avoiding the shut-out penalty.
   * Only legal during the swap phase. A resigned player sits the round out.
   */
  static resign(state: GameState, playerId: string): void {
    if (state.phase !== 'swap') throw new Error('Players may only resign before the round begins');
    const player = state.players.get(playerId);
    if (!player) throw new Error(`Unknown player ${playerId}`);
    player.hasResigned = true;
    player.hasSwapped = true; // does not block the swap→play transition
  }

  /** True once every player has either swapped or resigned. */
  static allSwapsComplete(state: GameState): boolean {
    for (const id of state.seatOrder) {
      if (!state.players.get(id)!.hasSwapped) return false;
    }
    return true;
  }

  /** Seat ids still in the round (not resigned), in seat order. */
  static activePlayers(state: GameState): string[] {
    return state.seatOrder.filter((id) => !state.players.get(id)!.hasResigned);
  }

  /**
   * Transitions from the swap phase to trick play. The first active seat in
   * seat order leads the opening trick.
   */
  static beginPlay(state: GameState): void {
    if (state.phase !== 'swap') throw new Error('Can only begin play from the swap phase');
    const active = MuushigEngine.activePlayers(state);
    if (active.length === 0) {
      state.phase = 'finished';
      return;
    }
    state.leaderId = active[0]!;
    state.currentTurn = active[0]!;
    state.currentTrick.splice(0, state.currentTrick.length);
    state.ledSuit = '';
    state.phase = 'playing';
  }

  // ──────────────────────────── Trick logic ────────────────────────────

  static isTrump(card: Card, trumpSuit: string): boolean {
    return card.suit === trumpSuit;
  }

  /**
   * Whether `candidate` would beat the current best card on the table.
   * Trump beats non-trump; within trumps and within the led suit, higher rank
   * wins; an off-suit non-trump card can never beat.
   */
  static beats(candidate: Card, currentBest: Card, ledSuit: string, trumpSuit: string): boolean {
    const candTrump = MuushigEngine.isTrump(candidate, trumpSuit);
    const bestTrump = MuushigEngine.isTrump(currentBest, trumpSuit);

    if (candTrump) {
      return bestTrump ? candidate.rank > currentBest.rank : true;
    }
    // candidate is not a trump
    if (bestTrump) return false;
    return candidate.suit === ledSuit && candidate.rank > currentBest.rank;
  }

  /**
   * Legal cards a player may play. If the player holds any card that would beat
   * the current best card, they MUST play one of those; otherwise any card is
   * legal. The leader (empty trick) may play anything.
   */
  static legalMoves(
    hand: Card[],
    currentTrick: TrickPlay[],
    ledSuit: string,
    trumpSuit: string,
  ): Card[] {
    if (currentTrick.length === 0) return [...hand];
    const best = MuushigEngine.currentBestCard(currentTrick, ledSuit, trumpSuit)!;
    const beating = hand.filter((c) => MuushigEngine.beats(c, best, ledSuit, trumpSuit));
    return beating.length > 0 ? beating : [...hand];
  }

  /** The currently-winning card among the cards played so far in the trick. */
  static currentBestCard(
    currentTrick: TrickPlay[],
    ledSuit: string,
    trumpSuit: string,
  ): Card | undefined {
    if (currentTrick.length === 0) return undefined;
    let best = currentTrick[0]!.card;
    for (let i = 1; i < currentTrick.length; i++) {
      const c = currentTrick[i]!.card;
      if (MuushigEngine.beats(c, best, ledSuit, trumpSuit)) best = c;
    }
    return best;
  }

  /** Next seat after `fromId` that is still active (not resigned). */
  static nextActiveSeat(state: GameState, fromId: string): string {
    const order = state.seatOrder;
    const n = order.length;
    const start = order.indexOf(fromId);
    for (let step = 1; step <= n; step++) {
      const id = order[(start + step) % n]!;
      if (!state.players.get(id)!.hasResigned) return id;
    }
    return fromId;
  }

  /** True when every active player has contributed a card to the trick. */
  static isTrickComplete(state: GameState): boolean {
    return state.currentTrick.length >= MuushigEngine.activePlayers(state).length;
  }

  /**
   * Plays one card from a player's hand into the current trick, enforcing turn
   * order and the must-beat legality rule. Advances the turn; when the trick is
   * complete the turn is left on the last player and {@link isTrickComplete}
   * returns true — the caller should then call {@link resolveTrick}.
   */
  static playCard(state: GameState, playerId: string, card: Card): void {
    if (state.phase !== 'playing')
      throw new Error('Cards can only be played during the playing phase');
    if (state.currentTurn !== playerId) throw new Error("Not this player's turn");

    const player = state.players.get(playerId);
    if (!player) throw new Error(`Unknown player ${playerId}`);
    if (player.hasResigned) throw new Error('Resigned players cannot play');

    const handIndex = player.hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);
    if (handIndex === -1) throw new Error("Card is not in the player's hand");

    const ledSuit = state.currentTrick.length === 0 ? card.suit : state.ledSuit;
    const legal = MuushigEngine.legalMoves(
      [...player.hand] as Card[],
      [...state.currentTrick] as TrickPlay[],
      ledSuit,
      state.trumpSuit,
    );
    if (!legal.some((c) => c.suit === card.suit && c.rank === card.rank)) {
      throw new Error('Illegal move: you must beat the current card if you can');
    }

    const [played] = player.hand.splice(handIndex, 1);
    if (state.currentTrick.length === 0) state.ledSuit = played!.suit;
    state.currentTrick.push(new TrickPlay(playerId, played!));

    if (!MuushigEngine.isTrickComplete(state)) {
      state.currentTurn = MuushigEngine.nextActiveSeat(state, playerId);
    }
  }

  /**
   * Resolves a completed trick: awards it to the highest card, advances trick
   * bookkeeping, and makes the winner the leader of the next trick. The trick
   * area is cleared.
   */
  static resolveTrick(state: GameState): TrickResult {
    if (state.currentTrick.length === 0) throw new Error('No trick to resolve');

    let winning = state.currentTrick[0]!;
    for (let i = 1; i < state.currentTrick.length; i++) {
      const play = state.currentTrick[i]!;
      if (MuushigEngine.beats(play.card, winning.card, state.ledSuit, state.trumpSuit)) {
        winning = play;
      }
    }

    const winnerId = winning.playerId;
    const winningCard = winning.card;
    state.players.get(winnerId)!.tricksWon += 1;

    state.currentTrick.splice(0, state.currentTrick.length);
    state.ledSuit = '';
    state.tricksPlayed += 1;
    state.leaderId = winnerId;
    state.currentTurn = winnerId;

    return { winnerId, winningCard };
  }

  /** True once all {@link HAND_SIZE} tricks of the round have been played. */
  static isRoundComplete(state: GameState): boolean {
    return state.tricksPlayed >= HAND_SIZE;
  }

  // ──────────────────────────── Scoring ────────────────────────────

  /**
   * Applies end-of-round scoring: each player lowers their score by the number
   * of tricks they won; a player who took no tricks gains the shut-out penalty.
   * Resigned players are unaffected. Players reaching 0 or below are recorded as
   * winners and the game is marked finished.
   *
   * NOTE: the source rules' description of resign scoring is contradictory (it
   * says resigning "reduces your points by the number of tricks you'd taken").
   * Pending clarification from a native player, a resigned player's score is
   * left unchanged. See GAME_RULES.md.
   */
  static scoreRound(state: GameState): RoundScore {
    const deltas: Record<string, number> = {};

    for (const id of state.seatOrder) {
      const p = state.players.get(id)!;
      if (p.hasResigned) {
        deltas[id] = 0;
        continue;
      }
      let delta = -p.tricksWon;
      if (p.tricksWon === 0) delta += SHUT_OUT_PENALTY;
      p.score += delta;
      deltas[id] = delta;
    }

    const winners: string[] = [];
    for (const id of state.seatOrder) {
      if (state.players.get(id)!.score <= 0) {
        winners.push(id);
        if (!state.winners.includes(id)) state.winners.push(id);
      }
    }

    if (winners.length > 0) state.phase = 'finished';
    return { deltas, winners };
  }

  /** True once at least one player has reached a winning score. */
  static isGameOver(state: GameState): boolean {
    return state.winners.length > 0;
  }
}
