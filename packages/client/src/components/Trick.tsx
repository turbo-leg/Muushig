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
}

/** The center of the table — cards thrown down at natural, seeded angles. */
export function Trick({ plays, trumpSuit, winnerId }: Props) {
  return (
    <div className="flex min-h-[88px] items-center justify-center gap-1 sm:min-h-[120px]">
      {plays.length === 0 ? (
        <span className="font-hand text-lg text-cream/70">{t('noCardsYet')}</span>
      ) : (
        plays.map((p, i) => {
          const rot = tiltFor(`${p.playerId}:${cardKey(p.card)}`);
          const isWinner = winnerId != null && p.playerId === winnerId;
          const dimmed = winnerId != null && !isWinner;
          return (
            <div
              key={p.playerId}
              data-winner={isWinner || undefined}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isWinner ? 'z-10 scale-110' : dimmed ? 'opacity-50' : ''
              }`}
            >
              <div
                className={`card-thrown anim-play-in w-[clamp(46px,10vw,66px)] ${
                  isWinner
                    ? 'rounded-lg ring-2 ring-amber shadow-[0_0_18px_rgba(202,138,4,0.8)]'
                    : ''
                }`}
                style={
                  { '--throw-rot': `${rot}deg`, animationDelay: `${i * 40}ms` } as CSSProperties
                }
              >
                <PlayingCard
                  suit={p.card.suit}
                  rank={p.card.rank}
                  trump={p.card.suit === trumpSuit}
                  className="w-full"
                />
              </div>
              <span
                className={`max-w-[64px] truncate font-hand text-sm ${
                  isWinner ? 'font-bold text-amber-deep' : 'text-cream/80'
                }`}
              >
                {p.username}
              </span>
            </div>
          );
        })
      )}
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
