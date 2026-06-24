import { describe, test, expect } from 'vitest';
import { MuushigEngine } from '../src/engine/MuushigEngine';
import { Card, Suit, Rank, ALL_SUITS } from '../src/state/Card';
import { makeRng } from './helpers';

describe('Deck', () => {
  test('createDeck builds 32 unique cards, 8 per suit (7..A)', () => {
    const deck = MuushigEngine.createDeck();
    expect(deck).toHaveLength(32);

    for (const suit of ALL_SUITS) {
      expect(deck.filter((card) => card.suit === suit)).toHaveLength(8);
    }

    // No 4/5/6 and no jokers — lowest rank is 7, highest is Ace.
    expect(Math.min(...deck.map((card) => card.rank))).toBe(Rank.Seven);
    expect(Math.max(...deck.map((card) => card.rank))).toBe(Rank.Ace);

    const keys = new Set(deck.map((card) => card.key));
    expect(keys.size).toBe(32);
  });

  test('shuffleDeck preserves the exact multiset of cards', () => {
    const original = MuushigEngine.createDeck();
    const shuffled = MuushigEngine.shuffleDeck(MuushigEngine.createDeck(), makeRng(42));

    expect(shuffled).toHaveLength(32);
    expect(new Set(shuffled.map((card) => card.key))).toEqual(
      new Set(original.map((card) => card.key)),
    );
  });

  test('shuffleDeck is deterministic for a given seed and reorders the deck', () => {
    const a = MuushigEngine.shuffleDeck(MuushigEngine.createDeck(), makeRng(7));
    const b = MuushigEngine.shuffleDeck(MuushigEngine.createDeck(), makeRng(7));
    const ordered = MuushigEngine.createDeck();

    expect(a.map((card) => card.key)).toEqual(b.map((card) => card.key));
    expect(a.map((card) => card.key)).not.toEqual(ordered.map((card) => card.key));
  });
});

describe('Card identity', () => {
  test('key is stable and suit/rank addressable', () => {
    expect(new Card(Suit.Hearts, Rank.Ace).key).toBe('Hearts:14');
  });
});
