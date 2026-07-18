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
  fold: { en: 'Fold', mn: 'Хаях' },
  swap: { en: 'Swap', mn: 'Солих' },
  swapN: { en: 'Swap {n}', mn: '{n} солих' },
  keep: { en: 'Keep', mn: 'Үлдээх' },
  again: { en: 'Again', mn: 'Дахин' },
  navshih: { en: 'Navshih', mn: 'Навших' },

  // ── Status scrolls ──
  waitingHost: { en: 'Waiting for host to deal…', mn: 'Хуваахыг хүлээж байна…' },
  waitingOthers: { en: 'Waiting for others…', mn: 'Бусдыг хүлээж байна…' },
  waitingTurn: { en: 'Waiting for your turn…', mn: 'Ээлжээ хүлээж байна…' },
  waitingOthersSwap: { en: 'Waiting for others to swap…', mn: 'Бусдын солихыг хүлээж байна…' },
  waitingTurnSwap: { en: 'Waiting for your turn to swap…', mn: 'Солих ээлжээ хүлээж байна…' },
  yourTurnThrow: { en: 'Your turn — throw a card', mn: 'Таны ээлж — хөзрөө тавь' },
  waitingCurrent: { en: 'Waiting for current player…', mn: 'Тоглогчийг хүлээж байна…' },
  watchingNotice: {
    en: 'Watching — you join the next game',
    mn: 'Үзэж байна — дараагийн тоглолтод сууна',
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
  seatFold: { en: 'Fold', mn: 'Хаясан' },
  seatTurn: { en: 'Turn', mn: 'Ээлж' },
  seatBot: { en: 'Bot', mn: 'Робот' },
  seatSwapped: { en: 'Swapped', mn: 'Сольсон' },
  ledTooltip: { en: 'Led the trick', mn: 'Түрүүлж тавьсан' },
  trickCounter: { en: '{n}/5', mn: '{n}/5' },
  seatReconnecting: { en: 'Reconnecting…', mn: 'Холбогдож байна…' },
  hostTooltip: { en: 'Room host', mn: 'Ширээний эзэн' },
  you: { en: '(you)', mn: '(та)' },
  removeSeat: { en: 'Remove {name}', mn: '{name}-г гаргах' },
  dealerTooltip: { en: 'Dealer', mn: 'Хуваагч' },
  amankhuzuuTooltip: {
    en: 'Amankhuzuu — first to act',
    mn: 'Аманхүзүү — түрүүлж явна',
  },
  deadAceTooltip: {
    en: 'Dying Ace — player failed to open trick with the trump Ace. It is dead and cannot win.',
    mn: 'Үхсэн тамга — модны тамгаар түрүүлж яваагүй тул тамга нь үхсэн (хожих хүчингүй).',
  },

  // ── Connection (App shell) ──
  settlingIn: { en: 'Settling in by the fire…', mn: 'Галын дэргэд тухалж байна…' },
  reconnectingTable: { en: 'Reconnecting to the table…', mn: 'Ширээнд эргэн холбогдож байна…' },
  connectionFailed: { en: 'Connection failed', mn: 'Холболт амжилтгүй боллоо' },

  // ── Table ──
  pullUpStool: { en: 'Pull up a stool', mn: 'Сандлаа тат' },
  readyUpSubtitle: { en: 'ready up to deal the cards', mn: 'бэлэн болбол хөзөр хуваана' },
  tapCardForTrump: {
    en: 'Tap a card to give for the trump',
    mn: 'Модоор солих гарынхаа хөзрийг сонго',
  },
  watchingCount: { en: '👁 {n} watching', mn: '👁 {n} үзэж байна' },
  trumpLabel: { en: 'Trump', mn: 'Мод' },
  noCardsYet: { en: 'No cards down yet…', mn: 'Хөзөр тавигдаагүй…' },

  // ── Round end / game end ──
  roundOver: { en: 'Round over', mn: 'Үе дууслаа' },
  foldedRow: { en: 'folded', mn: 'хаясан' },
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
  statRating: { en: 'Rating', mn: 'Чансаа' },
  statStreak: { en: 'Streak', mn: 'Цуврал' },
  deepStatsTitle: { en: 'Deep stats', mn: 'Нарийн үзүүлэлт' },
  statFoldRate: { en: 'Fold rate', mn: 'Тарах хувь' },
  statAvgTricks: { en: 'Avg tricks', mn: 'Дундаж идсэн' },
  statMuushigd: { en: "Muushig'd", mn: 'Муушиг болсон' },
  statMuushigdOthers: { en: 'Muushig’d others', mn: 'Муушиг оруулсан' },
  statNavshih: { en: 'Navshih', mn: 'Навших' },
  statHaranhui: { en: 'Haranhui', mn: 'Харанхуй' },
  statPerfect: { en: 'Perfect rounds', mn: 'Бүгдийг идсэн' },
  statBestStreak: { en: 'Best streak', mn: 'Шилдэг цуврал' },
  ratingHistory: { en: 'Rating history', mn: 'Чансааны түүх' },
  recentGames: { en: 'Recent games', mn: 'Сүүлийн тоглолтууд' },
  loadingEllipsis: { en: 'Loading…', mn: 'Ачаалж байна…' },
  noGamesYet: { en: 'No games yet — go deal a round.', mn: 'Тоглолт алга — хөзрөө хуваа.' },
  tabStats: { en: 'Stats', mn: 'Үзүүлэлт' },
  tabShop: { en: 'Shop', mn: 'Дэлгүүр' },
  activeLabel: { en: 'Equipped', mn: 'Идэвхтэй' },
  equipAction: { en: 'Equip', mn: 'Сонгох' },
  buyAction: { en: 'Unlock', mn: 'Авах' },
  shopTitle: { en: 'Card Back Shop', mn: 'Хөзрийн арны дэлгүүр' },
  skinUnlocked: { en: 'Unlocked', mn: 'Нээсэн' },
  winLabel: { en: 'Win', mn: 'Хожил' },
  lossLabel: { en: 'Loss', mn: 'Хожигдол' },
  vsLabel: { en: 'vs {names}', mn: '{names}-тэй' },
  placementLabel: { en: '#{n}', mn: '#{n}' },
  roundsColumn: { en: 'Round-by-round', mn: 'Үе тус бүрээр' },
  roundShort: { en: 'R{n}', mn: 'Ү{n}' },
  foldedShort: { en: 'fold', mn: 'хаясан' },
  tricksShort: { en: '{n} tricks', mn: '{n} идсэн' },

  // ── Leaderboard ──
  leaderboardTitle: { en: 'Leaderboard', mn: 'Тэргүүлэгчид' },
  openLeaderboard: { en: 'Open leaderboard', mn: 'Тэргүүлэгчдийг харах' },
  leaderboardEmpty: { en: 'No ranked players yet.', mn: 'Чансаатай тоглогч алга.' },
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
    mn: 'Муушиг бол 2-5 тоглогч тоглодог, хөзөр идэх зорилготой тоглоом юм.\nТоглогч бүр 15 оноотой эхэлж, оноогоо хассаар хамгийн түрүүнд 0 оноотой болсон нь хожно.\nИдсэн хөзөр бүрийн тоогоор оноо хасагдана.\nТоглохоор ороод нэг ч хөзөр идэж чадаагүй бол 5 оноо нэмэгдэж, муушигтана!',
  },
  helpDealTitle: { en: 'The deal', mn: 'Хуваалт' },
  helpDealBody: {
    en: 'A 32-card deck: 7 through Ace in four suits.\nEveryone gets 5 cards, then one card is turned face-up — its suit is trump for the round.\n6 face-down cards form the stock (tal).\nD marks the dealer; АМ marks the amankhuzuu, who always acts first.',
    mn: '4 өнгийн 7-оос Тамга хүртэлх нийт 32 хөзрөөр тоглоно.\nТоглогч бүрд 5 хөзөр тарааж, дараа нь 1 хөзрийг ил дэлгэнэ. Ил дэлгэсэн хөзрийн өнгө нь тухайн үеийн мод (давах өнгө) болно.\nҮлдсэн 6 хөзрийг доош харуулан тавихыг тал гэнэ.\nD тэмдэглэгээ нь хуваагчийг, харин АМ тэмдэглэгээ нь үргэлж түрүүлж явах аманхүзүүг заана.',
  },
  helpBidTitle: { en: 'Bid or fold', mn: 'Тоглох уу, хаях уу' },
  helpBidBody: {
    en: 'Before each round, players take turns choosing: bid (play the round) or fold.\nFolding keeps your score safe — but wins nothing.\nFold 3 rounds in a row and the next is haranhui: you must play it.',
    mn: 'Үе бүрийн эхэнд тоглогчид ээлжээр тоглох эсвэл хаях сонголтоо хийнэ.\nХөзрөө хаявал тухайн үед оноо хөдлөхгүй боловч хөзөр идэх боломжгүй болно.\nДараалан 3 үе хаявал дараагийн үед заавал харанхуй тоглоно (хаях эрхгүй).',
  },
  helpSwapTitle: { en: 'The draw & navshih', mn: 'Солилт ба навших' },
  helpSwapBody: {
    en: 'Bidders may trade up to 5 cards with the stock, in turn order.\nThe dealer has one extra move: take the face-up trump card in exchange for any hand card — navshih.',
    mn: 'Тоглохоор үлдсэн тоглогчид ээлжээрээ талын хөзрөөс өөрийнхөө гарыг 5 хүртэл хөзрөөр солих замаар сайжруулж болно.\nХуваагчийн хувьд дэлгээтэй байгаа модны ил хөзрийг гарынхаа дурын хөзрөөр сольж авах нэмэлт боломж байх бөгөөд үүнийг навших гэнэ.',
  },
  helpTrickTitle: { en: 'Playing tricks', mn: 'Хөзөр идэх' },
  helpTrickBody: {
    en: 'Follow the led suit if you can — and beat the highest card on the table if you can.\nNo led suit in hand? You must play a trump if you hold one.\nOtherwise throw anything.\nHighest trump wins the trick; with no trump, the highest card of the led suit.',
    mn: 'Тоглогчид гарсан хөзрийн өнгийг заавал дагах бөгөөд чадвал хамгийн өндөр хөзрийг дарах ёстой.\nХэрэв дагах өнгө гарт байхгүй бол заавал модоор (дамжин) явах ёстой.\nДагах өнгө болон мод байхгүй тохиолдолд дурын хөзрөө хаяж болно.\nҮеийн хамгийн өндөр модтой тоглогч хөзөр иднэ. Мод тавигдаагүй бол гарсан өнгөний хамгийн өндөр хөзөр иднэ.',
  },
  helpGlossaryTitle: { en: 'The words', mn: 'Үгсийн тайлбар' },
  helpGlossaryBody: {
    en: 'Muushig — bid but took no tricks: +5 points.\nNavshih — the dealer’s trump-card exchange.\nHaranhui — the forced round after 3 folds.\nAmankhuzuu — sits left of the dealer, acts first.\nTal — the 6-card face-down stock.',
    mn: 'Муушиг — Тоглохоор үлдээд нэг ч хөзөр идээгүй тохиолдолд (+5 онооны торгууль).\nНавших — Хуваагч дэлгээтэй модны ил хөзрийг өөрийн гарын хөзрөөр солих боломж.\nХаранхуй — Дараалан 3 үе хөзрөө хаясан тоглогч дараагийн үед заавал тоглох дүрэм.\nАманхүзүү — Хуваагчийн зүүн гарт сууж буй, үед түрүүлж явах тоглогч.\nТал — Газарт доош харуулан тавьсан, солиход зориулагдсан үлдэгдэл 6 хөзөр.',
  },

  // ── Settings ──
  settingsTitle: { en: 'Settings', mn: 'Тохиргоо' },
  openSettings: { en: 'Open settings', mn: 'Тохиргоо нээх' },
  muteAll: { en: 'Mute all sound', mn: 'Бүх дууг хаах' },
  sfxVolume: { en: 'Effects volume', mn: 'Эффектийн дуу' },
  musicToggle: { en: 'Tavern music', mn: 'Мухлагийн хөгжим' },
  musicVolume: { en: 'Music volume', mn: 'Хөгжмийн дуу' },
  languageRow: { en: 'Language', mn: 'Хэл' },
  rulesRow: { en: 'How to play', mn: 'Тоглох заавар' },
  privacyLink: { en: 'Privacy Policy', mn: 'Нууцлалын бодлого' },
  termsLink: { en: 'Terms of Service', mn: 'Үйлчилгээний нөхцөл' },

  // ── Crash fallback ──
  crashTitle: { en: 'The table wobbled', mn: 'Ширээ ганхлаа' },
  crashBody: {
    en: 'Something broke on our side. Reload to sit back down — your seat is held.',
    mn: 'Манай талд алдаа гарлаа. Дахин ачаалбал суудал чинь хүлээж байгаа.',
  },
  crashReload: { en: 'Reload', mn: 'Дахин ачаалах' },

  // ── Lobby / tables ──
  homeLabel: { en: 'Home', mn: 'Нүүр' },
  filterGameType: { en: 'Game Type', mn: 'Тоглоомын Төрөл' },
  filterStakes: { en: 'Stakes', mn: 'Бооцоо' },
  lobbyTitle: { en: 'Welcome to the tavern', mn: 'Мухлагт тавтай морил' },
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
  leaveTable: { en: 'Leave table', mn: 'Ширээнээс гарах' },
  openTables: { en: 'Open tables', mn: 'Нээлттэй ширээнүүд' },
  refreshTables: { en: 'Refresh', mn: 'Шинэчлэх' },
  noTablesYet: { en: 'No tables yet — start one with Play.', mn: 'Ширээ алга — Тоглох дар.' },
  joinTable: { en: 'Join', mn: 'Суух' },
  watchTable: { en: 'Watch', mn: 'Үзэх' },
  inGameLabel: { en: 'in game', mn: 'тоглож байна' },
  unnamedTable: { en: '{host}’s table', mn: '{host}-н ширээ' },
  tableNamePlaceholder: { en: 'Table name (optional)', mn: 'Ширээний нэр (заавал биш)' },
  privateToggle: { en: 'Private (join by code)', mn: 'Хаалттай (кодоор орно)' },
  premiumOnly: { en: 'Hosting tables is a premium perk.', mn: 'Ширээ үүсгэх нь премиум боломж.' },

  // ── First-game hints ──
  hintDecision: {
    en: 'Weak hand? Folding costs nothing — bidding and losing every trick costs +5.',
    mn: 'Гар муу бол хөзрөө хаяхад алдах юмгүй — тоглоод хөзөр идээгүй тохиолдолд +5 онооны торгуультай.',
  },
  hintSwap: {
    en: 'Trade away low off-suit cards; keep trumps and high cards.',
    mn: 'Бага өнгөний хөзрөө соль; мод болон өндөр хөзрөө үлдээ.',
  },
  hintPlay: {
    en: 'You must follow the led suit — and beat the table if you can.',
    mn: 'Гарсан өнгөөр явах ёстой — чадвал дарж яв.',
  },

  // ── Post-game recap ──
  recapTitle: { en: 'Your game', mn: 'Таны тоглолт' },
  recapStayed: { en: 'Bid {stayed}/{total} rounds', mn: '{total} үеэс {stayed}-д тоглосон' },
  recapTricks: { en: '{n} tricks', mn: '{n} хөзөр идсэн' },
  recapMuushigd: { en: 'muushig’d ×{n}', mn: '×{n} муушиг болсон' },
  recapPerfect: { en: 'perfect round ×{n}', mn: '×{n} бүгдийг идсэн' },

  // ── Newly Added Keys ──
  closeScoresheet: { en: 'Close scoresheet', mn: 'Онооны хуудас хаах' },
  scoresheetEmpty: {
    en: 'No rounds scored yet — the board starts at 15.',
    mn: 'Тоглолт хараахан эхлээгүй байна — 15 оноотой эхэлнэ.',
  },
  scoresheetFooter: {
    en: 'Start at 15, count down to 0. “-” = folded that round.',
    mn: '15-аас эхлэн 0 хүртэл тоолно. “-” = тухайн үед хаясан.',
  },
  signInToPlay: { en: 'Sign in to play', mn: 'Тоглохын тулд нэвтрэх' },
  signInSubtitle: {
    en: 'Track your games, wins, and match history.',
    mn: 'Тоглолт, хожил болон түүхээ хянах.',
  },
  continueDiscord: { en: 'Continue with Discord', mn: 'Discord-оор үргэлжлүүлэх' },
  continueGoogle: { en: 'Continue with Google', mn: 'Google-ээр үргэлжлүүлэх' },
  continueFacebook: { en: 'Continue with Facebook', mn: 'Facebook-ээр үргэлжлүүлэх' },
  youName: { en: 'You', mn: 'Та' },
  openProfile: { en: 'Open profile', mn: 'Хувийн мэдээлэл' },
  signOut: { en: 'Sign out', mn: 'Гарах' },
  tavernSubtitle: { en: 'Mongolian Tavern Card Game', mn: 'Монгол мухлагийн хөзрийн тоглоом' },
  faceDownCard: { en: 'Face-down card', mn: 'Доош нь харуулсан хөзөр' },
  cardDesc: { en: '{rank} of {suit}', mn: '{suit}-ийн {rank}' },
  Spades: { en: 'Spades', mn: 'Гил' },
  Hearts: { en: 'Hearts', mn: 'Бундан' },
  Diamonds: { en: 'Diamonds', mn: 'Дөрвөлжин' },
  Clubs: { en: 'Clubs', mn: 'Цэцэг' },
  tableEmpty: { en: 'Empty', mn: 'Сул' },
  tableWaiting: { en: 'Waiting', mn: 'Хүлээж байна' },
  tablePlaying: { en: 'Playing', mn: 'Тоглож байна' },
  J: { en: 'Jack', mn: 'Боов' },
  Q: { en: 'Queen', mn: 'Хатан' },
  K: { en: 'King', mn: 'Ноён' },
  A: { en: 'Ace', mn: 'Тамга' },
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
