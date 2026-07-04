/**
 * First-run gating for onboarding. On storage failure (some embedded
 * contexts) everything reads as "already seen" so broken storage can never
 * trap players in forced modals.
 */
const SEEN_RULES_KEY = 'muushig:seenRules';
const PLAYED_ONCE_KEY = 'muushig:playedOnce';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return true;
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* non-persistent — the session just sees the onboarding again next time */
  }
}

/** The rules book has been shown (or dismissed) at least once. */
export const hasSeenRules = (): boolean => readFlag(SEEN_RULES_KEY);
export const markRulesSeen = (): void => writeFlag(SEEN_RULES_KEY);

/** A full game has been played to its end at least once (silences hints). */
export const hasPlayedOnce = (): boolean => readFlag(PLAYED_ONCE_KEY);
export const markPlayedOnce = (): void => writeFlag(PLAYED_ONCE_KEY);
