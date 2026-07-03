import { Card, Suit, ALL_SUITS, ALL_RANKS } from '../state/Card';
import { Player, STARTING_SCORE } from '../state/Player';
import { TrickPlay } from '../state/TrickPlay';
import { GameState } from '../state/GameState';

/** Cards dealt to each player. */
export const HAND_SIZE = 5;
/** Face-down cards available to draw from during the swap phase (the "tal"). */
export const STOCK_SIZE = 6;
/** Maximum cards a player may exchange during the swap phase. */
export const MAX_SWAP = 5;
/** Penalty added to a player's score for taking zero tricks in a round. */
export const SHUT_OUT_PENALTY = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;
/** Haranhui oroh: you may fold at most this many rounds in a row (the next is forced to play). */
export const MAX_CONSECUTIVE_FOLDS = 3;

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
   * starting value, and deals the first round. Existing Player objects are
   * kept (preserving identity fields — username, avatar, bot/connection
   * flags); only their game progress is reset.
   */
  static initializeGame(state: GameState, playerIds: string[], rng: RNG = Math.random): void {
    if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) {
      throw new Error(`Muushig requires ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
    }

    for (const id of [...state.players.keys()]) {
      if (!playerIds.includes(id)) state.players.delete(id);
    }
    state.seatOrder.splice(0, state.seatOrder.length);

    for (const id of playerIds) {
      let p = state.players.get(id);
      if (!p) {
        p = new Player(id);
        state.players.set(id, p);
      }
      p.score = STARTING_SCORE;
      p.scoreLog.splice(0, p.scoreLog.length);
      p.consecutiveFolds = 0;
      state.seatOrder.push(id);
    }
    state.hostId = playerIds[0]!;
    state.maxPlayers = MAX_PLAYERS;
    state.winners.splice(0, state.winners.length);
    // Fresh game → restart dealer rotation (first deal makes the last seat dealer).
    state.dealerId = '';

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
      p.hasDecided = false;
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

    // Exactly STOCK_SIZE cards form the face-down stock; any further undealt
    // cards are set aside (out of play) for the round.
    state.stock.splice(0, state.stock.length);
    state.stock.push(...deck.slice(deck.length - STOCK_SIZE));

    // Reset trick/turn bookkeeping.
    state.currentTrick.splice(0, state.currentTrick.length);
    state.ledSuit = '';
    state.tricksPlayed = 0;

    // The dealer rotates one seat clockwise each round. The very first round's
    // dealer is the last seat, so seatOrder[0] opens the game. The amankhuzuu
    // sits to the dealer's left and opens the round — they decide, swap, and
    // lead first.
    const n = state.seatOrder.length;
    const prevDealer = state.seatOrder.indexOf(state.dealerId);
    const dealerIdx = prevDealer === -1 ? n - 1 : (prevDealer + 1) % n;
    state.dealerId = state.seatOrder[dealerIdx]!;
    state.amankhuzuuId = state.seatOrder[(dealerIdx + 1) % n]!;
    state.trumpExchanged = false;

    state.leaderId = state.amankhuzuuId;
    state.currentTurn = state.amankhuzuuId;

    state.phase = 'decision';
  }

  // ──────────────────────────── Decision phase ────────────────────────────

  /**
   * Records a player's pre-round choice: stay (play) or resign. Made in the
   * `decision` phase, before any cards are swapped.
   */
  static decide(state: GameState, playerId: string, stay: boolean): void {
    if (state.phase !== 'decision')
      throw new Error('Decisions are only made in the decision phase');
    const player = state.players.get(playerId);
    if (!player) throw new Error(`Unknown player ${playerId}`);
    // Haranhui oroh: a player who has already folded MAX_CONSECUTIVE_FOLDS rounds
    // in a row may not fold again — they must play this one.
    if (!stay && player.consecutiveFolds >= MAX_CONSECUTIVE_FOLDS) {
      throw new Error('Haranhui oroh: cannot fold again — you must play this round');
    }
    player.hasDecided = true;
    player.hasResigned = !stay;
    // Track the consecutive-fold streak: folding extends it, playing resets it.
    player.consecutiveFolds = stay ? 0 : player.consecutiveFolds + 1;
    // Decisions go clockwise from the amankhuzuu; advance the turn to the next
    // seat in order (everyone decides, so resigned seats are not skipped here).
    state.currentTurn = MuushigEngine.nextSeatInOrder(state, playerId);
  }

  /** Next seat after `fromId` in plain seat order (no skipping). */
  static nextSeatInOrder(state: GameState, fromId: string): string {
    const order = state.seatOrder;
    const i = order.indexOf(fromId);
    if (i === -1) return fromId;
    return order[(i + 1) % order.length]!;
  }

  /** True once every player has chosen to stay or resign. */
  static allDecided(state: GameState): boolean {
    for (const id of state.seatOrder) {
      if (!state.players.get(id)!.hasDecided) return false;
    }
    return true;
  }

  /**
   * Transitions `decision → swap`. Resigned players are marked as having
   * completed their swap so they don't block the swap → play transition.
   */
  static beginSwap(state: GameState): void {
    if (state.phase !== 'decision')
      throw new Error('Can only begin swapping from the decision phase');
    for (const id of state.seatOrder) {
      const p = state.players.get(id)!;
      if (p.hasResigned) p.hasSwapped = true;
    }
    // Swapping goes clockwise from the amankhuzuu; the first staying seat acts first.
    state.currentTurn = MuushigEngine.activePlayersFrom(state, state.amankhuzuuId)[0] ?? '';
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

    // Unique, in-range indices, capped at MAX_SWAP (you only hold HAND_SIZE).
    const unique = [...new Set(handIndices)].filter((i) => i >= 0 && i < player.hand.length);
    const requested = unique.slice(0, MAX_SWAP);
    // You may only draw as many as remain in the stock — over-drawing is rejected,
    // not silently capped. (Asking for 3 when 1 is left is not allowed.)
    if (requested.length > state.stock.length)
      throw new Error('Cannot draw more cards than remain in the stock');
    const count = requested.length;
    const chosen = [...requested].sort((a, b) => b - a); // desc for safe splicing

    for (const idx of chosen) {
      player.hand.splice(idx, 1);
    }
    for (let i = 0; i < count; i++) {
      player.hand.push(state.stock.shift()!);
    }

    player.hasSwapped = true;
    // Pass the swap turn to the next staying seat (resigned seats are skipped).
    state.currentTurn = MuushigEngine.nextActiveSeat(state, playerId);
    return count;
  }

  /**
   * Lets the dealer take the face-up trump card into their hand in exchange for
   * one of their cards. Allowed only in the swap phase — i.e. after every player
   * has folded or played and the stayers have drawn. The trump card and trump
   * SUIT stay exactly as originally flipped — the dealer's given card does NOT
   * become the trump; it is set aside (out of play). One exchange per round.
   *
   * @param handIndex index of the dealer's hand card to give up.
   */
  static exchangeTrump(state: GameState, playerId: string, handIndex: number): void {
    if (state.phase !== 'swap')
      throw new Error('The trump card can only be exchanged in the swap phase (after fold/play)');
    if (playerId !== state.dealerId) throw new Error('Only the dealer may exchange the trump card');
    if (state.trumpExchanged) throw new Error('The trump card was already exchanged this round');

    const player = state.players.get(playerId);
    if (!player) throw new Error(`Unknown player ${playerId}`);
    if (player.hasResigned) throw new Error('A resigned dealer cannot exchange the trump card');
    if (handIndex < 0 || handIndex >= player.hand.length)
      throw new Error("Card is not in the dealer's hand");

    // The dealer takes the trump card into hand; their given card is set aside.
    // A fresh Card avoids moving a schema node between containers. trumpCard and
    // trumpSuit are intentionally left untouched — the trump does not change.
    const takenTrump = new Card(state.trumpCard.suit, state.trumpCard.rank);
    player.hand.splice(handIndex, 1, takenTrump);
    state.trumpExchanged = true;
  }

  /** True once every staying player has swapped (resigned players are pre-marked). */
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

  /** Active (not resigned) seats in turn order starting at `startId` (clockwise). */
  static activePlayersFrom(state: GameState, startId: string): string[] {
    const order = state.seatOrder;
    const len = order.length;
    const start = Math.max(0, order.indexOf(startId));
    const result: string[] = [];
    for (let k = 0; k < len; k++) {
      const id = order[(start + k) % len]!;
      if (!state.players.get(id)!.hasResigned) result.push(id);
    }
    return result;
  }

  /**
   * Transitions from the swap phase to trick play. The first active seat
   * clockwise from the amankhuzuu leads the opening trick.
   */
  static beginPlay(state: GameState): void {
    if (state.phase !== 'swap') throw new Error('Can only begin play from the swap phase');
    const active = MuushigEngine.activePlayersFrom(state, state.amankhuzuuId);
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
   * Legal cards a player may play, following Muushig's strict order:
   *  1. If you hold the led suit, you MUST play it — and if you hold a led-suit
   *     card higher than the highest led-suit card on the table, you must play a
   *     higher one. (You may not trump while holding the led suit.)
   *  2. Otherwise, if you hold a trump, you MUST play a trump.
   *  3. Otherwise you may play (slough) anything.
   * The leader (empty trick) may play anything.
   */
  static legalMoves(
    hand: Card[],
    currentTrick: TrickPlay[],
    ledSuit: string,
    trumpSuit: string,
  ): Card[] {
    if (currentTrick.length === 0) return [...hand];

    const ledCards = hand.filter((c) => c.suit === ledSuit);
    if (ledCards.length > 0) {
      const highestLedOnTable = Math.max(
        ...currentTrick.filter((p) => p.card.suit === ledSuit).map((p) => p.card.rank),
      );
      const higher = ledCards.filter((c) => c.rank > highestLedOnTable);
      return higher.length > 0 ? higher : ledCards;
    }

    const trumps = hand.filter((c) => c.suit === trumpSuit);
    if (trumps.length > 0) return trumps;

    return [...hand];
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
   * of tricks they won; a player who stayed but took no tricks gains the
   * shut-out penalty. A resigned player's score is unchanged. Players reaching 0
   * or below win; if several cross in the same round, the lowest (most negative)
   * score wins, so `winners` is ordered best-first.
   */
  static scoreRound(state: GameState): RoundScore {
    const deltas: Record<string, number> = {};

    for (const id of state.seatOrder) {
      const p = state.players.get(id)!;
      if (p.hasResigned) {
        deltas[id] = 0;
        p.scoreLog.push('-'); // folded this round
        continue;
      }
      let delta = -p.tricksWon;
      if (p.tricksWon === 0) delta += SHUT_OUT_PENALTY;
      p.score += delta;
      deltas[id] = delta;
      p.scoreLog.push(String(p.score)); // new running total
    }

    // Winners ordered by score ascending (lowest negative wins ties).
    const winners = state.seatOrder
      .filter((id) => state.players.get(id)!.score <= 0)
      .slice()
      .sort((a, b) => state.players.get(a)!.score - state.players.get(b)!.score);

    if (winners.length > 0) {
      state.winners.splice(0, state.winners.length);
      state.winners.push(...winners);
      state.phase = 'finished';
    }
    return { deltas, winners };
  }

  /** True once at least one player has reached a winning score. */
  static isGameOver(state: GameState): boolean {
    return state.winners.length > 0;
  }
}
