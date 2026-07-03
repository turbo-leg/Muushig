import type { CSSProperties } from 'react';
import type { TrickPlayVM } from '../game/types';
import { PlayingCard } from './PlayingCard';
import { cardKey } from '../game/legalMoves';
import { tiltFor } from '../game/throw';

interface Props {
  plays: TrickPlayVM[];
  trumpSuit: string;
}

/** The center of the table — cards thrown down at natural, seeded angles. */
export function Trick({ plays, trumpSuit }: Props) {
  return (
    <div className="flex min-h-[88px] items-center justify-center gap-1 sm:min-h-[120px]">
      {plays.length === 0 ? (
        <span className="font-hand text-lg text-cream/70">No cards down yet…</span>
      ) : (
        plays.map((p, i) => {
          const rot = tiltFor(`${p.playerId}:${cardKey(p.card)}`);
          return (
            <div key={p.playerId} className="flex flex-col items-center gap-1">
              <div
                className="card-thrown anim-play-in w-[clamp(46px,10vw,66px)]"
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
              <span className="max-w-[64px] truncate font-hand text-sm text-cream/80">
                {p.username}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
