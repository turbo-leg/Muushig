import type { Phase, SeatVM } from '../game/types';

const SUIT_GLYPH: Record<string, string> = {
  Spades: '♠',
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
};

interface Props {
  seats: SeatVM[];
  phase: Phase;
  isMyTurn: boolean;
  /** Username of whoever is currently on turn. */
  turnName: string;
  ledSuit: string;
  trumpSuit: string;
}

/**
 * Picture-in-Picture degradation: when the Activity is pinned to a tiny window
 * we shed all card graphics and interaction, showing only the essentials —
 * whose turn it is, the trump/led suit, and the running scores — to draw the
 * player back to the focused view.
 */
export function PipView({ seats, phase, isMyTurn, turnName, ledSuit, trumpSuit }: Props) {
  const headline =
    phase === 'waiting'
      ? 'Waiting to deal…'
      : phase === 'finished'
        ? 'Game over'
        : isMyTurn
          ? 'Your turn!'
          : turnName
            ? `${turnName}…`
            : '…';

  return (
    <div className="flex h-full w-full select-none flex-col items-center justify-center gap-2 p-2 text-center">
      <div
        className={`font-hand text-2xl font-bold leading-none ${
          isMyTurn ? 'anim-turn rounded px-2 text-amber' : 'text-cream/80'
        }`}
      >
        {headline}
      </div>

      {phase === 'playing' && trumpSuit && (
        <div className="font-hand text-base text-cream/70">
          Trump {SUIT_GLYPH[trumpSuit] ?? trumpSuit}
          {ledSuit ? ` · Led ${SUIT_GLYPH[ledSuit] ?? ledSuit}` : ''}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5">
        {seats.map((s) => (
          <span
            key={s.id}
            className={`font-hand text-sm ${s.isMe ? 'font-bold text-amber-deep' : 'text-cream/80'} ${
              s.hasResigned ? 'opacity-50' : ''
            }`}
          >
            {s.username} <span className="num font-bold">{s.hasResigned ? '-' : s.score}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
