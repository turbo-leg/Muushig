import type { CardVM } from '../game/types';
import { PlayingCard } from './PlayingCard';

interface Props {
  card: CardVM;
  trump?: boolean;
  selected?: boolean;
  playable?: boolean;
  disabled?: boolean;
  index?: number;
  onClick?: () => void;
}

/** Interactive hand card: deal-in animation, hover lift, select / disabled states. */
export function Card({ card, trump, selected, playable, disabled, index = 0, onClick }: Props) {
  const interactive = !!onClick && !disabled;
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'anim-deal relative block w-[var(--card-w,clamp(50px,12vw,78px))] transition-transform duration-200',
        interactive
          ? 'cursor-pointer hover:z-10 hover:-translate-y-2 focus-visible:z-10 focus-visible:-translate-y-2'
          : 'cursor-default',
        selected ? 'z-10 -translate-y-3' : '',
        disabled ? 'opacity-55 saturate-50' : '',
        'focus-visible:outline-none',
      ].join(' ')}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <PlayingCard
        suit={card.suit}
        rank={card.rank}
        trump={trump}
        className={[
          'w-full',
          selected ? 'drop-shadow-[0_0_14px_rgba(217,142,4,0.7)]' : '',
          playable && !selected ? 'drop-shadow-[0_0_10px_rgba(217,142,4,0.4)]' : '',
        ].join(' ')}
      />
    </button>
  );
}
