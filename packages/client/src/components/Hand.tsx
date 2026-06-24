import type { CardVM, Phase } from '../game/types';
import { cardKey } from '../game/legalMoves';
import { Card } from './Card';

interface Props {
  cards: CardVM[];
  phase: Phase;
  trumpSuit: string;
  isMyTurn: boolean;
  canSwap: boolean;
  legalKeys: Set<string>;
  selectedKeys: Set<string>;
  onToggleSelect: (card: CardVM) => void;
  onPlay: (card: CardVM) => void;
}

export function Hand({
  cards,
  phase,
  trumpSuit,
  isMyTurn,
  canSwap,
  legalKeys,
  selectedKeys,
  onToggleSelect,
  onPlay,
}: Props) {
  if (cards.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-[clamp(2px,1vw,8px)]">
      {cards.map((c, i) => {
        const key = cardKey(c);
        const playable = phase === 'playing' && isMyTurn && legalKeys.has(key);
        const onClick =
          phase === 'playing'
            ? playable
              ? () => onPlay(c)
              : undefined
            : phase === 'swap' && canSwap
              ? () => onToggleSelect(c)
              : undefined;

        return (
          <Card
            key={key}
            card={c}
            index={i}
            trump={c.suit === trumpSuit}
            playable={playable}
            selected={selectedKeys.has(key)}
            disabled={phase === 'playing' ? !playable : false}
            onClick={onClick}
          />
        );
      })}
    </div>
  );
}
