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

/** Cards the player may legally play right now (empty trick ⇒ anything). */
export function legalMoves(
  hand: CardLike[],
  trick: PlayLike[],
  ledSuit: string,
  trumpSuit: string,
): CardLike[] {
  if (trick.length === 0) return [...hand];
  const best = currentBest(trick, ledSuit, trumpSuit)!;
  const beating = hand.filter((c) => beats(c, best, ledSuit, trumpSuit));
  return beating.length > 0 ? beating : [...hand];
}

export function cardKey(c: CardLike): string {
  return `${c.suit}:${c.rank}`;
}
