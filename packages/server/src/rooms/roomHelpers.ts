import { Card, Suit, ALL_SUITS, ALL_RANKS } from '@muushig/shared';
import { isProfane, tavernGuestName } from '../lib/profanity';

export const MAX_STRING_LEN = 64;

/** Trims and length-caps untrusted client strings. */
export function sanitizeString(value: unknown, max = MAX_STRING_LEN): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

/**
 * Display-name sanitation at the trust boundary: length-cap, then replace the
 * WHOLE name with a generated tavern guest name on a profanity hit — no
 * asterisks, keeps the storybook tone. Empty input stays empty (callers keep
 * their own Player-N fallback).
 */
export function sanitizeUsername(value: unknown): string {
  const name = sanitizeString(value, 32).trim();
  if (!name) return '';
  return isProfane(name) ? tavernGuestName() : name;
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
