import { useSyncExternalStore } from 'react';

/**
 * Tiny two-locale i18n layer (en/mn) — a message catalog, a module-level
 * locale store, and `t()`. Muushig terms (navshih, haranhui, amankhuzuu,
 * muushig itself) stay romanised/Cyrillic in both locales; tooltips carry
 * the explanation.
 *
 * Components read strings via `t()`; only top-level views (App, Table)
 * subscribe with `useLocale()` — everything below re-renders with them.
 */
export type Locale = 'en' | 'mn';

const STORAGE_KEY = 'muushig:locale';

const messages = {
  // ── Buttons (main label; the other locale doubles as the sub-caption) ──
  ready: { en: 'Ready', mn: 'Бэлэн' },
  cancel: { en: 'Cancel', mn: 'Болих' },
  deal: { en: 'Deal', mn: 'Хуваах' },
  wait: { en: 'Wait', mn: 'Хүлээх' },
  invite: { en: 'Invite', mn: 'Урих' },
  addBot: { en: 'Add bot', mn: 'Робот нэмэх' },
  bid: { en: 'Bid', mn: 'Мөрцөх' },
  fold: { en: 'Fold', mn: 'Тарах' },
  swap: { en: 'Swap', mn: 'Солих' },
  swapN: { en: 'Swap {n}', mn: '{n} солих' },
  keep: { en: 'Keep', mn: 'Үлдээх' },
  again: { en: 'Again', mn: 'Дахин' },
  navshih: { en: 'Navshih', mn: 'Навших' },

  // ── Status scrolls ──
  waitingHost: { en: 'Waiting for host to deal…', mn: 'Хуваахыг хүлээж байна…' },
  waitingOthers: { en: 'Waiting for others…', mn: 'Бусдыг хүлээж байна…' },
  waitingTurn: { en: 'Waiting for your turn…', mn: 'Ээлжээ хүлээж байна…' },
  waitingOthersSwap: { en: 'Waiting for others to swap…', mn: 'Бусдын сольхыг хүлээж байна…' },
  waitingTurnSwap: { en: 'Waiting for your turn to swap…', mn: 'Солих ээлжээ хүлээж байна…' },
  yourTurnThrow: { en: 'Your turn — throw a card', mn: 'Таны ээлж — хөзрөө тавь' },
  waitingCurrent: { en: 'Waiting for current player…', mn: 'Тоглогчийг хүлээж байна…' },
  watchingNotice: {
    en: 'Watching — you join the next game',
    mn: 'Үзэж байна — дараагийн тоглолтод суана',
  },
  mustPlay: { en: 'Haranhui — must play', mn: 'Харанхуй орох — заавал тоглоно' },
  youWin: { en: 'You win!', mn: 'Та хожлоо!' },
  playerWins: { en: '{names} wins', mn: '{names} хожлоо' },
  someone: { en: 'Someone', mn: 'Хэн нэгэн' },

  // ── Seat placard statuses ──
  seatReady: { en: 'Ready', mn: 'Бэлэн' },
  seatWaiting: { en: 'Waiting', mn: 'Хүлээж…' },
  seatBid: { en: 'Bid', mn: 'Мөрцсөн' },
  seatBidding: { en: 'Bidding…', mn: 'Бодож байна…' },
  seatFold: { en: 'Fold', mn: 'Тарсан' },
  seatTurn: { en: 'Turn', mn: 'Ээлж' },
  seatBot: { en: 'Bot', mn: 'Робот' },
  seatReconnecting: { en: 'Reconnecting…', mn: 'Холбогдож байна…' },
  you: { en: '(you)', mn: '(та)' },
  removeSeat: { en: 'Remove {name}', mn: '{name}-г гаргах' },
  dealerTooltip: { en: 'Dealer', mn: 'Хуваагч' },
  amankhuzuuTooltip: {
    en: 'Amankhuzuu — first to swap',
    mn: 'Аманхүзүү — эхэлж солино',
  },

  // ── Connection (App shell) ──
  settlingIn: { en: 'Settling in by the fire…', mn: 'Галын дэргэд тухлаж байна…' },
  reconnectingTable: { en: 'Reconnecting to the table…', mn: 'Ширээнд эргэн холбогдож байна…' },
  connectionFailed: { en: 'Connection failed', mn: 'Холболт амжилтгүй боллоо' },

  // ── Table ──
  pullUpStool: { en: 'Pull up a stool', mn: 'Сандлаа тат' },
  readyUpSubtitle: { en: 'ready up to deal the cards', mn: 'бэлэн болбол хөзөр хуваана' },
  tapCardForTrump: {
    en: 'Tap a card to give for the trump',
    mn: 'Хөзрийн оронд өгөх картаа сонго',
  },
  watchingCount: { en: '👁 {n} watching', mn: '👁 {n} үзэж байна' },
  trumpLabel: { en: 'Trump', mn: 'Хөзөр' },

  // ── Round end / game end ──
  roundOver: { en: 'Round over', mn: 'Үе дууслаа' },
  foldedRow: { en: 'folded', mn: 'тарсан' },
  winsThePot: { en: '🏆 {names} wins the pot!', mn: '🏆 {names} данхыг хожлоо!' },

  // ── Scoresheet / PiP ──
  scoresheet: { en: 'Scoresheet', mn: 'Онооны хуудас' },
  nowRow: { en: 'Now', mn: 'Одоо' },
  openScoresheet: { en: 'Open scoresheet', mn: 'Онооны хуудас нээх' },
  waitingToDeal: { en: 'Waiting to deal…', mn: 'Хуваахыг хүлээж байна…' },
  gameOverShort: { en: 'Game over', mn: 'Тоглолт дууслаа' },
  yourTurnShort: { en: 'Your turn!', mn: 'Таны ээлж!' },
  ledLabel: { en: 'Led', mn: 'Гарсан' },
} as const satisfies Record<string, Record<Locale, string>>;

export type MsgKey = keyof typeof messages;

function detect(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'mn') return stored;
  } catch {
    /* storage unavailable */
  }
  const lang = typeof navigator !== 'undefined' ? (navigator.language ?? '') : '';
  return lang.toLowerCase().startsWith('mn') ? 'mn' : 'en';
}

let current: Locale = detect();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  current = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* non-persistent override is fine */
  }
  for (const fn of listeners) fn();
}

export function toggleLocale(): void {
  setLocale(current === 'en' ? 'mn' : 'en');
}

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Message in the active locale. */
export function t(key: MsgKey, vars?: Record<string, string | number>): string {
  return format(messages[key][current], vars);
}

/** Same message in the *other* locale — the tavern buttons' sub-captions. */
export function tAlt(key: MsgKey, vars?: Record<string, string | number>): string {
  return format(messages[key][current === 'en' ? 'mn' : 'en'], vars);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Subscribes the component tree to locale changes (App / Table level). */
export function useLocale(): Locale {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}
