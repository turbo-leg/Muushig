import type { SeatVM, Phase } from '../game/types';
import { ScorePips } from './ScorePips';
import { PlayingCard } from './PlayingCard';

interface Props {
  seat: SeatVM;
  phase: Phase;
}

/** A player's spot at the table — a little parchment placard. */
export function Seat({ seat, phase }: Props) {
  return (
    <div
      className={`parchment flex min-w-[150px] flex-col items-center gap-1.5 px-3 py-2 ${
        seat.isTurn ? 'anim-turn' : ''
      } ${seat.hasResigned ? 'opacity-55' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`grid h-9 w-9 place-items-center rounded-full bg-wood font-hand text-2xl text-cream ${
            seat.isTurn ? 'ring-2 ring-amber' : 'ring-1 ring-wood-dark/40'
          }`}
        >
          {seat.username.charAt(0).toUpperCase()}
        </div>
        <div className="text-left leading-tight">
          <div className="flex items-center gap-1 font-hand text-lg text-ink">
            <span className="max-w-[92px] truncate">{seat.username}</span>
            {seat.isHost && <span className="text-amber-deep">★</span>}
            {seat.isMe && <span className="text-ink-soft">(you)</span>}
          </div>
          <div className="num font-hand text-base text-ink-soft">
            {seat.score} pts
            {phase !== 'waiting' && !seat.hasResigned && ` · ${seat.tricksWon} tricks`}
          </div>
        </div>
      </div>

      {phase === 'waiting' ? (
        <span className={`font-hand text-base ${seat.isReady ? 'text-success' : 'text-ink-soft'}`}>
          {seat.isReady ? 'Ready' : 'Waiting'}
        </span>
      ) : phase === 'decision' ? (
        <span
          className={`font-hand text-base ${
            seat.hasResigned ? 'text-danger' : seat.hasDecided ? 'text-success' : 'text-ink-soft'
          }`}
        >
          {seat.hasResigned ? 'Folded' : seat.hasDecided ? 'Staying' : 'Deciding…'}
        </span>
      ) : seat.hasResigned ? (
        <span className="font-hand text-base text-danger">Folded</span>
      ) : (
        <>
          <ScorePips score={seat.score} />
          {seat.handCount > 0 && !seat.isMe && (
            <div className="flex">
              {Array.from({ length: Math.min(seat.handCount, 5) }).map((_, i) => (
                <div key={i} style={{ marginLeft: i ? '-12px' : 0 }} className="w-5">
                  <PlayingCard faceDown className="w-full" />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
