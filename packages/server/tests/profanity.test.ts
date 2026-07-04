import { describe, test, expect } from 'vitest';
import { isProfane, normalizeForMatch } from '../src/lib/profanity';
import { sanitizeUsername } from '../src/rooms/roomHelpers';

describe('profanity — clean names pass', () => {
  test.each([
    'Turbileg',
    'Баатар',
    'Scunthorpe', // classic false-positive trap
    'Dickens', // substring of a short entry — boundary-protected
    'Analyst',
    'Сараа',
    'Golden Falcon',
  ])('%s passes', (name) => {
    expect(isProfane(name)).toBe(false);
  });
});

describe('profanity — hits are caught', () => {
  test.each([
    'fuck',
    'FuCkEr',
    'fuuuuck', // repeats collapsed
    'sh1t', // leet
    'b!tch',
    'ХУЙ тоглогч', // mn Cyrillic, word-bounded
    'пизда',
    'yanhan99',
    'xX_n4zi_Xx',
  ])('%s is flagged', (name) => {
    expect(isProfane(name)).toBe(true);
  });

  test('normalization folds leet, case, repeats, and zero-width chars', () => {
    expect(normalizeForMatch('F​U​C​K')).toBe('fuck');
    expect(normalizeForMatch('sh1111t')).toBe('shit');
  });
});

describe('sanitizeUsername', () => {
  test('keeps clean names and trims/caps them', () => {
    expect(sanitizeUsername('  Turbileg  ')).toBe('Turbileg');
    expect(sanitizeUsername('x'.repeat(64)).length).toBeLessThanOrEqual(32);
  });

  test('replaces a profane name with a tavern guest name', () => {
    const replaced = sanitizeUsername('fucker123');
    expect(replaced).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(isProfane(replaced)).toBe(false);
  });

  test('empty and non-string inputs stay empty', () => {
    expect(sanitizeUsername('')).toBe('');
    expect(sanitizeUsername(undefined)).toBe('');
    expect(sanitizeUsername(42)).toBe('');
  });
});
