import type { CSSProperties } from 'react';
import type { SeatVM, Phase } from '../game/types';

interface Props {
  seat: SeatVM;
  phase: Phase;
}

function statusLabel(seat: SeatVM, phase: Phase): { text: string; cls: string } | null {
  if (phase === 'waiting') {
    return seat.isReady
      ? { text: 'Ready', cls: 'text-success' }
      : { text: 'Waiting', cls: 'text-ink-soft' };
  }
  if (phase === 'decision') {
    if (seat.hasResigned) return { text: 'Folded', cls: 'text-danger' };
    return seat.hasDecided
      ? { text: 'Staying', cls: 'text-success' }
      : { text: 'Deciding…', cls: 'text-ink-soft' };
  }
  if (seat.hasResigned) return { text: 'Folded', cls: 'text-danger' };
  if (phase === 'playing' && seat.isTurn) return { text: 'Their turn', cls: 'text-amber-deep' };
  return null;
}

/** A player/bot placard: portrait + name + big penalty score, on torn parchment. */
export function Seat({ seat, phase }: Props) {
  const status = statusLabel(seat, phase);
  const avatarStyle: CSSProperties | undefined = seat.avatarUrl
    ? { backgroundImage: `url("${seat.avatarUrl}")` }
    : undefined;

  return (
    <div
      className={`placard flex min-w-[150px] items-center gap-3 px-3 py-2 ${
        seat.isTurn ? 'anim-turn' : ''
      } ${seat.hasResigned ? 'opacity-55' : ''}`}
    >
      <div
        className={`avatar-slot grid h-11 w-11 shrink-0 place-items-center font-hand text-2xl text-wood ${
          seat.isTurn ? 'ring-2 ring-amber' : ''
        }`}
        style={avatarStyle}
      >
        {!seat.avatarUrl && seat.username.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1 font-hand text-lg text-ink">
          <span className="max-w-[96px] truncate">{seat.username}</span>
          {seat.isHost && <span className="text-amber-deep">★</span>}
          {seat.isMe && <span className="text-ink-soft">(you)</span>}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="num font-hand text-3xl font-bold leading-none text-wood">
            {seat.score}
          </span>
          {status ? (
            <span className={`font-hand text-base ${status.cls}`}>{status.text}</span>
          ) : (
            <span className="font-hand text-base text-ink-soft">{seat.tricksWon} tricks</span>
          )}
        </div>
      </div>
    </div>
  );
}
