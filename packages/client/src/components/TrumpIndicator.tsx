import type { CardVM } from '../game/types';
import { PlayingCard } from './PlayingCard';

interface Props {
  card: CardVM | null;
  revealed: boolean;
}

/** The turned-up trump card, propped on the table with a warm glow. */
export function TrumpIndicator({ card, revealed }: Props) {
  if (!card) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`-rotate-3 ${revealed ? 'anim-reveal' : ''}`}>
        <PlayingCard
          suit={card.suit}
          rank={card.rank}
          trump
          className="w-[clamp(48px,11vw,68px)] drop-shadow-[0_0_16px_rgba(217,142,4,0.55)]"
        />
      </div>
      <span className="font-hand text-lg text-amber">Trump · {card.suit}</span>
    </div>
  );
}
