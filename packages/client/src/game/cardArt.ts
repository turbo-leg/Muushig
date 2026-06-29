/**
 * Card-face auto-loader. Any `{RANK}{SUIT}.webp` dropped into `src/assets/cards/`
 * (ranks `7 8 9 10 J Q K A`, suits `S H D C`, e.g. `KC.webp`, `10H.webp`, plus an
 * optional `back.webp`) is picked up at build time and resolved by suit+rank — no
 * per-card wiring. Cards with no art fall back to the CSS parchment face.
 */
const modules = import.meta.glob('../assets/cards/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const byCode: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const code = path
    .split('/')
    .pop()!
    .replace(/\.\w+$/, '');
  byCode[code] = url;
}

const SUIT_CODE: Record<string, string> = {
  Spades: 'S',
  Hearts: 'H',
  Diamonds: 'D',
  Clubs: 'C',
};

const RANK_CODE: Record<number, string> = {
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

/** Resolve the art URL for a card, or `undefined` if no asset exists yet. */
export function cardArt(suit?: string, rank?: number): string | undefined {
  if (!suit || rank == null) return undefined;
  const code = `${RANK_CODE[rank] ?? ''}${SUIT_CODE[suit] ?? ''}`;
  return byCode[code];
}

/** The shared card-back art, if a `back.png` has been added. */
export function cardBackArt(): string | undefined {
  return byCode['back'];
}
