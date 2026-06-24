import { describe, test, expect } from 'vitest';
import { beats, legalMoves, cardKey, type CardLike } from '../game/legalMoves';

const TRUMP = 'Spades';
const c = (suit: string, rank: number): CardLike => ({ suit, rank });

describe('beats()', () => {
  test('any trump beats any non-trump', () => {
    expect(beats(c('Spades', 7), c('Hearts', 14), 'Hearts', TRUMP)).toBe(true);
  });
  test('non-trump never beats a trump', () => {
    expect(beats(c('Hearts', 14), c('Spades', 7), 'Hearts', TRUMP)).toBe(false);
  });
  test('higher led-suit card beats lower; off-suit does not', () => {
    expect(beats(c('Hearts', 13), c('Hearts', 7), 'Hearts', TRUMP)).toBe(true);
    expect(beats(c('Diamonds', 14), c('Hearts', 7), 'Hearts', TRUMP)).toBe(false);
  });
});

describe('legalMoves()', () => {
  test('the leader may play anything', () => {
    const hand = [c('Hearts', 7), c('Clubs', 9)];
    expect(legalMoves(hand, [], '', TRUMP)).toHaveLength(2);
  });

  test('must beat with a higher led card when able', () => {
    const hand = [c('Hearts', 8), c('Diamonds', 14)];
    const trick = [{ card: c('Hearts', 7) }];
    expect(legalMoves(hand, trick, 'Hearts', TRUMP).map(cardKey)).toEqual(['Hearts:8']);
  });

  test('must trump when holding no higher led card', () => {
    const hand = [c('Spades', 7), c('Clubs', 9)];
    const trick = [{ card: c('Hearts', 13) }];
    expect(legalMoves(hand, trick, 'Hearts', TRUMP).map(cardKey)).toEqual(['Spades:7']);
  });

  test('must follow suit and may NOT trump while holding the led suit', () => {
    const hand = [c('Hearts', 7), c('Spades', 14)]; // holds led Heart + trump Ace
    const trick = [{ card: c('Hearts', 13) }];
    expect(legalMoves(hand, trick, 'Hearts', TRUMP).map(cardKey)).toEqual(['Hearts:7']);
  });

  test('may play anything when unable to beat', () => {
    const hand = [c('Diamonds', 8), c('Clubs', 9)];
    const trick = [{ card: c('Hearts', 13) }];
    expect(legalMoves(hand, trick, 'Hearts', TRUMP)).toHaveLength(2);
  });
});
