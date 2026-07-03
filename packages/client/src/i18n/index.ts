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

  // ── Profile / deep stats ──
  closeProfile: { en: 'Close profile', mn: 'Хаах' },
  muushigPlayer: { en: 'Муушиг player', mn: 'Муушиг тоглогч' },
  statPlayed: { en: 'Played', mn: 'Тоглосон' },
  statWon: { en: 'Won', mn: 'Хожсон' },
  statWinPct: { en: 'Win %', mn: 'Хожлын %' },
  statRating: { en: 'Rating', mn: 'Зэрэглэл' },
  statStreak: { en: 'Streak', mn: 'Дараалал' },
  deepStatsTitle: { en: 'Deep stats', mn: 'Нарийн үзүүлэлт' },
  statFoldRate: { en: 'Fold rate', mn: 'Тарах хувь' },
  statAvgTricks: { en: 'Avg tricks', mn: 'Дундаж нүд' },
  statMuushigd: { en: "Muushig'd", mn: 'Муушиг болсон' },
  statMuushigdOthers: { en: 'Muushig’d others', mn: 'Муушиг оруулсан' },
  statNavshih: { en: 'Navshih', mn: 'Навших' },
  statHaranhui: { en: 'Haranhui', mn: 'Харанхуй' },
  statPerfect: { en: 'Perfect rounds', mn: 'Бүх нүд авсан' },
  statBestStreak: { en: 'Best streak', mn: 'Шилдэг дараалал' },
  ratingHistory: { en: 'Rating history', mn: 'Зэрэглэлийн түүх' },
  recentGames: { en: 'Recent games', mn: 'Сүүлийн тоглолтууд' },
  loadingEllipsis: { en: 'Loading…', mn: 'Ачаалж байна…' },
  noGamesYet: { en: 'No games yet — go deal a round.', mn: 'Тоглолт алга — хөзрөө хуваа.' },
  winLabel: { en: 'Win', mn: 'Хожил' },
  lossLabel: { en: 'Loss', mn: 'Хожигдол' },
  vsLabel: { en: 'vs {names}', mn: '{names}-тэй' },
  placementLabel: { en: '#{n}', mn: '#{n}' },
  roundsColumn: { en: 'Round-by-round', mn: 'Үе тус бүрээр' },
  roundShort: { en: 'R{n}', mn: 'Ү{n}' },
  foldedShort: { en: 'fold', mn: 'тарсан' },
  tricksShort: { en: '{n} tricks', mn: '{n} нүд' },

  // ── Leaderboard ──
  leaderboardTitle: { en: 'Leaderboard', mn: 'Тэргүүлэгчид' },
  openLeaderboard: { en: 'Open leaderboard', mn: 'Тэргүүлэгчид харах' },
  leaderboardEmpty: { en: 'No ranked players yet.', mn: 'Зэрэглэлтэй тоглогч алга.' },
  colGames: { en: 'Games', mn: 'Тоглолт' },

  // ── Help book (page bodies are '\n'-separated lines) ──
  helpTitle: { en: 'How to play', mn: 'Хэрхэн тоглох вэ' },
  helpOpen: { en: 'How to play', mn: 'Тоглох заавар' },
  helpNext: { en: 'Next', mn: 'Дараах' },
  helpBack: { en: 'Back', mn: 'Буцах' },
  helpDone: { en: 'To the table!', mn: 'Ширээ рүү!' },
  helpPageOf: { en: '{n} / {total}', mn: '{n} / {total}' },
  helpGoalTitle: { en: 'The goal', mn: 'Зорилго' },
  helpGoalBody: {
    en: 'Muushig is a trick-taking card game for 2–5 players.\nEveryone starts at 15 points and counts DOWN — first to 0 wins.\nEvery trick you take removes 1 point.\nBid and take no tricks? +5 points — you got muushig’d!',
    mn: 'Муушиг бол 2–5 хүн тоглодог нүд авалцах хөзрийн тоглоом.\nБүгд 15 оноотой эхэлж, ДООШОО тоолно — эхэлж 0 хүрсэн нь хожно.\nАвсан нүд бүр 1 оноо хасна.\nМөрцөөд нэг ч нүд аваагүй бол +5 оноо — муушиг боллоо!',
  },
  helpDealTitle: { en: 'The deal', mn: 'Хуваалт' },
  helpDealBody: {
    en: 'A 32-card deck: 7 through Ace in four suits.\nEveryone gets 5 cards, then one card is turned face-up — its suit is trump for the round.\n6 face-down cards form the stock (tal).\nD marks the dealer; АМ marks the amankhuzuu, who always acts first.',
    mn: '32 хөзөр: дөрвөн өнгийн 7-оос Тамга.\nХүн бүрд 5 хөзөр тараагаад нэгийг нь ил дэлгэнэ — тэр өнгө энэ үеийн хөзөр (диргэх өнгө) болно.\nДарсан 6 хөзөр тал болно.\nD — хуваагч; АМ — аманхүзүү, үргэлж түрүүлж явна.',
  },
  helpBidTitle: { en: 'Bid or fold', mn: 'Мөрцөх үү, тарах уу' },
  helpBidBody: {
    en: 'Before each round, players take turns choosing: bid (play the round) or fold.\nFolding keeps your score safe — but wins nothing.\nFold 3 rounds in a row and the next is haranhui: you must play it.',
    mn: 'Үе бүрийн өмнө тоглогчид ээлжээрээ сонгоно: мөрцөх үү, тарах уу.\nТарвал оноо чинь хөдлөхгүй — гэхдээ юу ч хожихгүй.\n3 удаа дараалан тарвал дараагийнх нь харанхуй: заавал тоглоно.',
  },
  helpSwapTitle: { en: 'The draw & navshih', mn: 'Солилт ба навших' },
  helpSwapBody: {
    en: 'Bidders may trade up to 5 cards with the stock, in turn order.\nThe dealer has one extra move: take the face-up trump card in exchange for any hand card — navshih.',
    mn: 'Мөрцсөн хүмүүс ээлжээрээ талаас 5 хүртэл хөзөр сольж болно.\nХуваагчид нэмэлт боломж бий: ил хөзрийг гарын нэг хөзрөөрөө солих — навших.',
  },
  helpTrickTitle: { en: 'Playing tricks', mn: 'Нүд авалцах' },
  helpTrickBody: {
    en: 'Follow the led suit if you can — and beat the highest card on the table if you can.\nNo led suit in hand? You must play a trump if you hold one.\nOtherwise throw anything.\nHighest trump wins the trick; with no trump, the highest card of the led suit.',
    mn: 'Гарсан өнгөөр явах ёстой — чадвал ширээн дээрх хамгийн өндрийг нь дарж.\nТэр өнгө байхгүй бол хөзрөөр явах ёстой.\nАль нь ч байхгүй бол дуртайгаа хая.\nХамгийн өндөр хөзөр нүд авна; хөзөргүй бол гарсан өнгөний хамгийн өндөр нь.',
  },
  helpGlossaryTitle: { en: 'The words', mn: 'Үгсийн тайлбар' },
  helpGlossaryBody: {
    en: 'Muushig — bid but took no tricks: +5 points.\nNavshih — the dealer’s trump-card exchange.\nHaranhui — the forced round after 3 folds.\nAmankhuzuu — sits left of the dealer, acts first.\nTal — the 6-card face-down stock.',
    mn: 'Муушиг — мөрцөөд нэг ч нүд аваагүй: +5 оноо.\nНавших — хуваагчийн ил хөзөр солих эрх.\nХаранхуй — 3 тарсны дараах албан тоглолт.\nАманхүзүү — хуваагчийн зүүн гарт, түрүүлж явна.\nТал — дарсан 6 хөзөр.',
  },

  // ── Crash fallback ──
  crashTitle: { en: 'The table wobbled', mn: 'Ширээ ганхлаа' },
  crashBody: {
    en: 'Something broke on our side. Reload to sit back down — your seat is held.',
    mn: 'Манай талд алдаа гарлаа. Дахин ачаалбал суудал чинь хүлээж байгаа.',
  },
  crashReload: { en: 'Reload', mn: 'Дахин ачаалах' },

  // ── Lobby / tables ──
  lobbyTitle: { en: 'Welcome to the tavern', mn: 'Мууштай тавтай морил' },
  lobbySubtitle: { en: 'find a table to sit at', mn: 'суух ширээгээ сонго' },
  quickPlay: { en: 'Play', mn: 'Тоглох' },
  hostTable: { en: 'Host a table', mn: 'Ширээ гаргах' },
  joinWithCode: { en: 'Join with code', mn: 'Кодоор нэгдэх' },
  codePlaceholder: { en: 'CODE', mn: 'КОД' },
  seatsLabel: { en: '{n} seats', mn: '{n} суудал' },
  tableCode: { en: 'Table code', mn: 'Ширээний код' },
  copyCode: { en: 'Copy', mn: 'Хуулах' },
  copiedCode: { en: 'Copied!', mn: 'Хуулагдлаа!' },
  tableClosed: { en: 'That table is gone.', mn: 'Ширээ олдсонгүй.' },
  backToLobby: { en: 'Back to the tavern', mn: 'Буцах' },
  kickedNotice: { en: 'You were removed from the table.', mn: 'Таныг ширээнээс гаргалаа.' },
  confirmKick: { en: 'Tap ✕ again to remove {name}', mn: '{name}-г гаргахын тулд ✕ дахин дар' },
  leaveTable: { en: 'Leave table', mn: 'Ширээ орхих' },

  // ── First-game hints ──
  hintDecision: {
    en: 'Weak hand? Folding costs nothing — bidding and losing every trick costs +5.',
    mn: 'Гар муу бол тарахад алдах юмгүй — мөрцөөд нүд авахгүй бол +5.',
  },
  hintSwap: {
    en: 'Trade away low off-suit cards; keep trumps and high cards.',
    mn: 'Бага өнгөний хөзрөө соль; хөзөр болон өндөр хөзрөө үлдээ.',
  },
  hintPlay: {
    en: 'You must follow the led suit — and beat the table if you can.',
    mn: 'Гарсан өнгөөр явах ёстой — чадвал дарж яв.',
  },

  // ── Post-game recap ──
  recapTitle: { en: 'Your game', mn: 'Таны тоглолт' },
  recapStayed: { en: 'Bid {stayed}/{total} rounds', mn: '{total} үеэс {stayed}-д мөрцсөн' },
  recapTricks: { en: '{n} tricks', mn: '{n} нүд авсан' },
  recapMuushigd: { en: 'muushig’d ×{n}', mn: '×{n} муушиг болсон' },
  recapPerfect: { en: 'perfect round ×{n}', mn: '×{n} бүх нүд авсан' },
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
