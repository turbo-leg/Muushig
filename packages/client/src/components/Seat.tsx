import type { SeatVM, Phase } from '../game/types';
import { ScorePips } from './ScorePips';
import { PlayingCard } from './PlayingCard';

interface Props {
  seat: SeatVM;
  phase: Phase;
}

export function Seat({ seat, phase }: Props) {
  return (
    <div
      className={`flex min-w-[140px] flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-colors duration-200 ${
        seat.isTurn ? 'anim-turn bg-void-raised' : 'bg-void/60'
      } ${seat.hasResigned ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`grid h-9 w-9 place-items-center rounded-full bg-night font-display text-h3 text-gold ${
            seat.isTurn ? 'ring-2 ring-gold' : 'ring-1 ring-starlight-faint/40'
          }`}
        >
          {seat.username.charAt(0).toUpperCase()}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1 font-body text-small text-starlight">
            <span className="max-w-[90px] truncate">{seat.username}</span>
            {seat.isHost && <span className="text-gold">★</span>}
            {seat.isMe && <span className="text-starlight-muted">(you)</span>}
          </div>
          <div className="num font-body text-small text-starlight-muted">
            {seat.score} pts
            {phase !== 'waiting' && !seat.hasResigned && ` · ${seat.tricksWon} tricks`}
          </div>
        </div>
      </div>

      {phase === 'waiting' ? (
        <span
          className={`text-small font-semibold ${seat.isReady ? 'text-success' : 'text-starlight-faint'}`}
        >
          {seat.isReady ? 'Ready' : 'Waiting'}
        </span>
      ) : phase === 'decision' ? (
        <span
          className={`text-small font-semibold ${
            seat.hasResigned
              ? 'text-danger'
              : seat.hasDecided
                ? 'text-success'
                : 'text-starlight-faint'
          }`}
        >
          {seat.hasResigned ? 'Resigned' : seat.hasDecided ? 'Staying' : 'Deciding…'}
        </span>
      ) : seat.hasResigned ? (
        <span className="text-small font-semibold text-danger">Resigned</span>
      ) : (
        <>
          <ScorePips score={seat.score} />
          {seat.handCount > 0 && !seat.isMe && (
            <div className="flex">
              {Array.from({ length: Math.min(seat.handCount, 5) }).map((_, i) => (
                <div key={i} style={{ marginLeft: i ? '-12px' : 0 }} className="w-5">
                  <PlayingCard faceDown className="h-auto w-full" />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
