import { Card, Suit, ALL_SUITS, ALL_RANKS } from '@muushig/shared';

export const MAX_STRING_LEN = 64;

/** Trims and length-caps untrusted client strings. */
export function sanitizeString(value: unknown, max = MAX_STRING_LEN): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

/**
 * Parses a `{ suit, rank }` message from a client into a validated Card, or
 * returns null if it is not a real Muushig card.
 */
export function parseCard(message: unknown): Card | null {
  if (typeof message !== 'object' || message === null) return null;
  const { suit, rank } = message as { suit?: unknown; rank?: unknown };
  if (typeof suit !== 'string' || typeof rank !== 'number') return null;
  if (!ALL_SUITS.includes(suit as Suit)) return null;
  if (!ALL_RANKS.includes(rank)) return null;
  return new Card(suit, rank);
}

/** Coerces an arbitrary client value into a clean array of hand indices. */
export function parseIndices(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((n): n is number => Number.isInteger(n) && n >= 0);
}
