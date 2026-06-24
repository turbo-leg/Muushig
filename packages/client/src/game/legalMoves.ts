/*
 * Client-side mirror of the trick-legality rule (see @muushig/shared
 * MuushigEngine). Operates on plain { suit, rank } objects so the client never
 * imports the Colyseus schema at runtime. Used only for UI hinting — the server
 * remains authoritative.
 */

export interface CardLike {
  suit: string;
  rank: number;
}

export interface PlayLike {
  card: CardLike;
}

export function isTrump(c: CardLike, trumpSuit: string): boolean {
  return c.suit === trumpSuit;
}

export function beats(cand: CardLike, best: CardLike, ledSuit: string, trumpSuit: string): boolean {
  const ct = isTrump(cand, trumpSuit);
  const bt = isTrump(best, trumpSuit);
  if (ct) return bt ? cand.rank > best.rank : true;
  if (bt) return false;
  return cand.suit === ledSuit && cand.rank > best.rank;
}

export function currentBest(
  trick: PlayLike[],
  ledSuit: string,
  trumpSuit: string,
): CardLike | null {
  if (trick.length === 0) return null;
  let best = trick[0]!.card;
  for (let i = 1; i < trick.length; i++) {
    if (beats(trick[i]!.card, best, ledSuit, trumpSuit)) best = trick[i]!.card;
  }
  return best;
}

/**
 * Cards the player may legally play right now (empty trick ⇒ anything), in
 * strict Muushig order: follow the led suit and over-beat the highest led card
 * if able; else you must trump; else slough anything. Mirrors
 * MuushigEngine.legalMoves — the server remains authoritative.
 */
export function legalMoves(
  hand: CardLike[],
  trick: PlayLike[],
  ledSuit: string,
  trumpSuit: string,
): CardLike[] {
  if (trick.length === 0) return [...hand];

  const ledCards = hand.filter((c) => c.suit === ledSuit);
  if (ledCards.length > 0) {
    const highestLedOnTable = Math.max(
      ...trick.filter((p) => p.card.suit === ledSuit).map((p) => p.card.rank),
    );
    const higher = ledCards.filter((c) => c.rank > highestLedOnTable);
    return higher.length > 0 ? higher : ledCards;
  }

  const trumps = hand.filter((c) => c.suit === trumpSuit);
  if (trumps.length > 0) return trumps;

  return [...hand];
}

export function cardKey(c: CardLike): string {
  return `${c.suit}:${c.rank}`;
}
