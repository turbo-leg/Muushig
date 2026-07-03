import type { CardVM } from '../game/types';
import { PlayingCard } from './PlayingCard';

interface Props {
  card: CardVM | null;
  revealed: boolean;
}

/** Vector drawing of a cozy, hand-drawn deck/draw pile stack. */
function DrawPile() {
  return (
    <div className="w-[clamp(54px,11vw,74px)] select-none" aria-hidden="true">
      <svg
        className="w-full aspect-[5/7] drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
        viewBox="0 0 100 140"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Layer 3 (Bottom card) */}
        <rect
          x="8"
          y="8"
          width="84"
          height="124"
          rx="6"
          fill="#422e24"
          stroke="#3a2a1e"
          strokeWidth="2"
        />

        {/* Layer 2 (Middle card) */}
        <rect
          x="4"
          y="4"
          width="84"
          height="124"
          rx="6"
          fill="#533a2e"
          stroke="#3a2a1e"
          strokeWidth="2"
        />

        {/* Layer 1 (Top card) */}
        <rect
          x="0"
          y="0"
          width="84"
          height="124"
          rx="6"
          fill="#6b4a33"
          stroke="#3a2a1e"
          strokeWidth="2"
        />

        {/* Card back inner border pattern */}
        <rect
          x="6"
          y="6"
          width="72"
          height="112"
          rx="4"
          fill="none"
          stroke="#5c4033"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />

        {/* Center ornament (traditional infinity knot motif) */}
        <g
          stroke="#e7d2b3"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        >
          <path d="M 34,62 L 42,54 L 50,62 L 42,70 Z" />
          <path d="M 28,58 L 36,50 L 44,58" />
          <path d="M 40,66 L 48,74 L 56,66" />
        </g>
      </svg>
    </div>
  );
}

/** The turned-up trump card, propped on the table next to the draw pile. */
export function TrumpIndicator({ card, revealed }: Props) {
  if (!card) return null;
  return (
    <div className="flex items-center justify-center gap-4 select-none">
      {/* Draw Pile (Deck) */}
      <DrawPile />

      {/* Turned-up Trump Card */}
      <div className="flex flex-col items-center gap-1">
        <div className={`-rotate-3 ${revealed ? 'anim-reveal' : ''}`}>
          <PlayingCard
            suit={card.suit}
            rank={card.rank}
            trump
            className="w-[clamp(48px,11vw,68px)]"
          />
        </div>
        <span className="font-hand text-lg font-bold text-amber">Trump · {card.suit}</span>
      </div>
    </div>
  );
}
