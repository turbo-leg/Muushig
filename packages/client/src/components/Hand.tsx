import type { CSSProperties } from 'react';
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
  /** Dealer is choosing a card to lay face-up in exchange for the trump card. */
  trumpSwapMode?: boolean;
  onPickTrump?: (index: number) => void;
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
  trumpSwapMode,
  onPickTrump,
}: Props) {
  if (cards.length === 0) return null;

  return (
    <div className="hand-row" style={{ '--hand-n': cards.length } as CSSProperties}>
      {cards.map((c, i) => {
        const key = cardKey(c);
        // In trump-swap mode every card is pickable; otherwise normal play/swap rules.
        const playable = trumpSwapMode
          ? true
          : phase === 'playing' && isMyTurn && legalKeys.has(key);
        const onClick = trumpSwapMode
          ? () => onPickTrump?.(i)
          : phase === 'playing'
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
            disabled={trumpSwapMode ? false : phase === 'playing' ? !playable : false}
            onClick={onClick}
          />
        );
      })}
    </div>
  );
}
