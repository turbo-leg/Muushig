import { SoyomboMark } from './SoyomboMark';

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

const STARLIGHT = '#E8ECF8';
const KHOKH = '#6FC0E6';
const GOLD = '#D4AF37';

function suitColor(suit: string, trump: boolean): string {
  if (trump) return GOLD;
  return suit === 'Hearts' || suit === 'Diamonds' ? KHOKH : STARLIGHT;
}

interface Props {
  suit?: string;
  rank?: number;
  faceDown?: boolean;
  trump?: boolean;
  className?: string;
}

/**
 * A single card face rendered as SVG (the bundled "deck" is generated, not
 * hand-drawn in CSS). The Tengri frame/glow lives here; interactive state
 * (lift/select/disable) is layered by the Card wrapper.
 */
export function PlayingCard({ suit = 'Spades', rank = 7, faceDown, trump, className }: Props) {
  const color = suitColor(suit, !!trump);
  const glyph = SUIT_GLYPH[suit] ?? '♠';
  const label = RANK_LABEL[rank] ?? '?';

  return (
    <svg
      viewBox="0 0 100 140"
      className={className}
      role="img"
      aria-label={faceDown ? 'Face-down card' : `${label} of ${suit}`}
    >
      <rect
        x="2"
        y="2"
        width="96"
        height="136"
        rx="12"
        fill={faceDown ? '#19224D' : '#11183A'}
        stroke={trump ? GOLD : 'rgba(212,175,55,0.4)'}
        strokeWidth={trump ? 2.5 : 1.5}
      />
      {faceDown ? (
        <>
          <rect
            x="9"
            y="9"
            width="82"
            height="122"
            rx="8"
            fill="none"
            stroke="rgba(212,175,55,0.25)"
            strokeWidth="1"
          />
          <foreignObject x="30" y="38" width="40" height="64">
            <SoyomboMark />
          </foreignObject>
        </>
      ) : (
        <>
          {/* top-left index */}
          <text
            x="12"
            y="26"
            fontFamily="Manrope, sans-serif"
            fontSize="20"
            fontWeight="700"
            fill={color}
          >
            {label}
          </text>
          <text x="12" y="44" fontSize="18" fill={color}>
            {glyph}
          </text>
          {/* center glyph */}
          <text x="50" y="86" fontSize="48" textAnchor="middle" fill={color} opacity="0.95">
            {glyph}
          </text>
          {/* bottom-right index (rotated) */}
          <g transform="rotate(180 50 70)">
            <text
              x="12"
              y="26"
              fontFamily="Manrope, sans-serif"
              fontSize="20"
              fontWeight="700"
              fill={color}
            >
              {label}
            </text>
            <text x="12" y="44" fontSize="18" fill={color}>
              {glyph}
            </text>
          </g>
        </>
      )}
    </svg>
  );
}
