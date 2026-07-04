import { describe, test, expect, beforeEach } from 'vitest';
import { hasSeenRules, markRulesSeen, hasPlayedOnce, markPlayedOnce } from '../lib/firstRun';

beforeEach(() => {
  localStorage.removeItem('muushig:seenRules');
  localStorage.removeItem('muushig:playedOnce');
});

describe('firstRun', () => {
  test('rules are unseen until marked, then persist', () => {
    expect(hasSeenRules()).toBe(false);
    markRulesSeen();
    expect(hasSeenRules()).toBe(true);
    expect(localStorage.getItem('muushig:seenRules')).toBe('1');
  });

  test('playedOnce is independent of seenRules', () => {
    markRulesSeen();
    expect(hasPlayedOnce()).toBe(false);
    markPlayedOnce();
    expect(hasPlayedOnce()).toBe(true);
    expect(hasSeenRules()).toBe(true);
  });
});
