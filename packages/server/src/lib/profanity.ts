/**
 * Username moderation at the server trust boundary. Small, curated,
 * high-confidence lists — false positives are worse than misses here, since a
 * hit replaces the player's whole name. Extend the lists as needed.
 */

// English (Latin script). Short entries match on word boundaries only.
const EN_WORDS = [
  'fuck',
  'fucker',
  'fucking',
  'shit',
  'bitch',
  'asshole',
  'cunt',
  'dick',
  'cock',
  'pussy',
  'whore',
  'slut',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'rape',
  'rapist',
  'hitler',
  'nazi',
];

// Mongolian (Cyrillic) — common vulgarities and slurs.
const MN_WORDS = [
  'пизда',
  'хуй',
  'муна',
  'мунаа',
  'новш',
  'гичий',
  'гичии',
  'бааст',
  'баас',
  'үхээрийн',
  'ялмаа',
  'янхан',
  'сда',
];

// Latin transliterations of the Mongolian entries people actually type.
const MN_TRANSLIT = ['huts', 'pizda', 'yanhan', 'gichii', 'novsh', 'munaa', 'baas'];

const WORDS = [...EN_WORDS, ...MN_WORDS, ...MN_TRANSLIT];

// Leetspeak folding applied before matching.
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

/** Lowercase → strip zero-width/diacritics → fold leet → collapse repeats. */
export function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u200b-\u200d\ufeff]/g, '')
    .split('')
    .map((c) => LEET[c] ?? c)
    .join('')
    .replace(/(.)\1+/g, '$1'); // "fuuuuck" → "fuck"
}

// The wordlist goes through the SAME normalization, so repeat-collapsing
// (which also folds double letters inside the words themselves) stays
// consistent between the list and the input.
const NORMALIZED_WORDS = [...new Set(WORDS.map(normalizeForMatch))];

/** Word-boundary for short entries (Scunthorpe protection), substring for long. */
function matches(normalized: string, word: string): boolean {
  if (word.length <= 4) {
    return new RegExp(`(?:^|[^\\p{L}])${word}(?:[^\\p{L}]|$)`, 'u').test(normalized);
  }
  return normalized.includes(word);
}

export function isProfane(name: string): boolean {
  const normalized = normalizeForMatch(name);
  return NORMALIZED_WORDS.some((w) => matches(normalized, w));
}

// Tavern-guest replacement names (mirrors the client's guest generator vibe).
const ADJECTIVES = ['Golden', 'Swift', 'Quiet', 'Lucky', 'Bold', 'Merry', 'Clever', 'Steady'];
const NOUNS = ['Falcon', 'Yak', 'Ibex', 'Wolf', 'Mare', 'Eagle', 'Marmot', 'Camel'];

export function tavernGuestName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a} ${n}`;
}
