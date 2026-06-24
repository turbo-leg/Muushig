import type { CardVM } from '../game/types';
import { PlayingCard } from './PlayingCard';
import { SoyomboMark } from './SoyomboMark';

interface Props {
  card: CardVM | null;
  revealed: boolean;
}

export function TrumpIndicator({ card, revealed }: Props) {
  if (!card) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${revealed ? 'anim-reveal' : ''}`}>
        <PlayingCard
          suit={card.suit}
          rank={card.rank}
          trump
          className="h-auto w-[clamp(44px,10vw,64px)] drop-shadow-[0_0_18px_rgba(212,175,55,0.5)]"
        />
        <SoyomboMark className="absolute -right-3 -top-3 w-6" />
      </div>
      <span className="font-display text-small text-gold">Trump · {card.suit}</span>
    </div>
  );
}
