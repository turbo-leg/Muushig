import type { CSSProperties } from 'react';
import type { TrickPlayVM } from '../game/types';
import { PlayingCard } from './PlayingCard';
import { cardKey } from '../game/legalMoves';
import { tiltFor } from '../game/throw';
import { t } from '../i18n';

interface Props {
  plays: TrickPlayVM[];
  trumpSuit: string;
  /** Set during the server's trick-reveal pause — highlights the taker. */
  winnerId?: string | null;
  /** playerId → felt-percent coordinates for where that player's card lands. */
  positions: Map<string, { left: number; top: number }>;
}

/**
 * The trick, laid out spatially: each thrown card sits on the felt toward the
 * player who threw it, like a real table — no name labels needed. The first
 * play (the lead) carries a small gold pip.
 */
export function Trick({ plays, trumpSuit, winnerId, positions }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] select-none">
      {plays.map((p, i) => {
        const rot = tiltFor(`${p.playerId}:${cardKey(p.card)}`);
        const isWinner = winnerId != null && p.playerId === winnerId;
        const dimmed = winnerId != null && !isWinner;
        const pos = positions.get(p.playerId) ?? { left: 50, top: 50 };
        return (
          <div
            key={p.playerId}
            data-winner={isWinner || undefined}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
              isWinner ? 'z-10 scale-110' : dimmed ? 'opacity-50' : ''
            }`}
            style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
          >
            <div
              className={`card-thrown anim-play-in relative w-[clamp(46px,10vw,66px)] ${
                isWinner ? 'rounded-lg ring-2 ring-amber shadow-[0_0_18px_rgba(202,138,4,0.8)]' : ''
              }`}
              style={{ '--throw-rot': `${rot}deg`, animationDelay: `${i * 40}ms` } as CSSProperties}
            >
              <PlayingCard
                suit={p.card.suit}
                rank={p.card.rank}
                trump={p.card.suit === trumpSuit}
                className="w-full"
              />
              {i === 0 && (
                <span
                  title={t('ledTooltip')}
                  aria-label={t('ledTooltip')}
                  className="absolute -left-1 -top-1 h-3 w-3 rounded-full border border-black/40 bg-amber shadow-[0_0_6px_rgba(202,138,4,0.9)]"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Face-down stack of tricks already taken, sat in front of a seat. */
export function TrickPile({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <div
      className="pointer-events-none flex select-none items-center"
      role="img"
      aria-label={label}
    >
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <div
          key={i}
          className={`h-9 w-7 ${i > 0 ? '-ml-4' : ''}`}
          style={{ transform: `rotate(${(i - 2) * 5}deg)` }}
        >
          <PlayingCard faceDown className="w-full" />
        </div>
      ))}
      {count > 5 && <span className="num ml-1 font-hand text-xs text-cream/70">×{count}</span>}
    </div>
  );
}
