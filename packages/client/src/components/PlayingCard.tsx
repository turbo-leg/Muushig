import type { CSSProperties } from 'react';
import { cardArt, cardBackArt } from '../game/cardArt';

const SUIT_GLYPH: Record<string, string> = {
  Spades: '♠',
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
};

const RANK_LABEL: Record<number, string> = {
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

/** Brick red for hearts/diamonds, dark ink for spades/clubs — ink-on-parchment. */
function suitColor(suit: string): string {
  return suit === 'Hearts' || suit === 'Diamonds' ? '#A33B2A' : '#3A2A1E';
}

interface Props {
  suit?: string;
  rank?: number;
  faceDown?: boolean;
  trump?: boolean;
  /** Optional card-art image URL — when set, replaces the parchment placeholder. */
  art?: string;
  className?: string;
}

/**
 * A single card. Art auto-loads by suit+rank from `src/assets/cards/` (see
 * cardArt.ts); pass an explicit `art="/assets/cards/AS.webp"` to override, or
 * leave it unresolved to fall back to the CSS parchment face with rank/suit.
 */
export function PlayingCard({
  suit = 'Spades',
  rank = 7,
  faceDown,
  trump,
  art,
  className = '',
}: Props) {
  const color = suitColor(suit);
  const glyph = SUIT_GLYPH[suit] ?? '♠';
  const label = RANK_LABEL[rank] ?? '?';

  // Resolve art: an explicit `art` prop wins, otherwise auto-load by suit+rank.
  const faceArt = faceDown ? undefined : (art ?? cardArt(suit, rank));
  const backArt = faceDown ? cardBackArt() : undefined;
  const style: CSSProperties | undefined = faceArt
    ? ({ '--card-art': `url("${faceArt}")` } as CSSProperties)
    : backArt
      ? ({ '--card-back': `url("${backArt}")` } as CSSProperties)
      : undefined;

  const cls = [
    'playing-card',
    faceDown ? 'playing-card--back' : '',
    trump ? 'playing-card--trump' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      style={style}
      role="img"
      aria-label={faceDown ? 'Face-down card' : `${label} of ${suit}`}
    >
      {faceDown ? (
        backArt ? null : (
          <span className="card-back-mark">М</span>
        )
      ) : faceArt ? null : (
        <>
          <span className="card-index card-index--tl" style={{ color }}>
            <span className="card-rank">{label}</span>
            <span className="card-suit">{glyph}</span>
          </span>
          <span className="card-center" style={{ color }}>
            {glyph}
          </span>
          <span className="card-index card-index--br" style={{ color }}>
            <span className="card-rank">{label}</span>
            <span className="card-suit">{glyph}</span>
          </span>
        </>
      )}
    </div>
  );
}
