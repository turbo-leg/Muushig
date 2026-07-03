import { describe, test, expect, afterEach } from 'vitest';
import { t, tAlt, getLocale, setLocale, toggleLocale } from '../i18n';

afterEach(() => setLocale('en'));

describe('i18n', () => {
  test('t() resolves in the active locale and tAlt() in the other', () => {
    setLocale('en');
    expect(t('ready')).toBe('Ready');
    expect(tAlt('ready')).toBe('Бэлэн');

    setLocale('mn');
    expect(t('ready')).toBe('Бэлэн');
    expect(tAlt('ready')).toBe('Ready');
  });

  test('interpolates {vars} and leaves unknown placeholders intact', () => {
    setLocale('en');
    expect(t('swapN', { n: 3 })).toBe('Swap 3');
    expect(t('playerWins', { names: 'Ariun, Bat' })).toBe('Ariun, Bat wins');
    expect(t('swapN')).toBe('Swap {n}'); // no vars supplied
  });

  test('toggleLocale flips between the two locales', () => {
    setLocale('en');
    toggleLocale();
    expect(getLocale()).toBe('mn');
    toggleLocale();
    expect(getLocale()).toBe('en');
  });
});
