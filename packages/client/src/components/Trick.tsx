import type { TrickPlayVM } from '../game/types';
import { PlayingCard } from './PlayingCard';

interface Props {
  plays: TrickPlayVM[];
  trumpSuit: string;
}

export function Trick({ plays, trumpSuit }: Props) {
  return (
    <div className="flex min-h-[120px] items-end justify-center gap-2">
      {plays.length === 0 ? (
        <span className="font-body text-small text-starlight-faint">No cards played yet</span>
      ) : (
        plays.map((p, i) => (
          <div
            key={p.playerId}
            className="anim-play-in flex flex-col items-center gap-1"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <PlayingCard
              suit={p.card.suit}
              rank={p.card.rank}
              trump={p.card.suit === trumpSuit}
              className="h-auto w-[clamp(40px,9vw,60px)]"
            />
            <span className="max-w-[60px] truncate text-[10px] text-starlight-muted">
              {p.username}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
