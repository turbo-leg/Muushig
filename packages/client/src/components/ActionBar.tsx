import type { Phase } from '../game/types';
import { Button } from './Button';

interface Props {
  phase: Phase;
  isHost: boolean;
  canStart: boolean;
  meReady: boolean;
  needPlayers: boolean;
  canSwap: boolean;
  isMyTurn: boolean;
  selectedCount: number;
  winnerNames: string[];
  isWinner: boolean;
  muted: boolean;
  onReady: () => void;
  onStart: () => void;
  onSwap: () => void;
  onKeep: () => void;
  onResign: () => void;
  onRematch: () => void;
  onToggleMute: () => void;
}

function MuteButton({ muted, onClick }: { muted: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      className="grid h-11 w-11 cursor-pointer place-items-center rounded-md text-starlight-muted transition-colors duration-200 hover:bg-void-raised hover:text-starlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-khokh"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
        {muted ? (
          <path d="m23 9-6 6M17 9l6 6" />
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
    </button>
  );
}

export function ActionBar(props: Props) {
  const { phase, isHost, canStart, meReady, needPlayers, canSwap, isMyTurn } = props;

  return (
    <div className="flex w-full items-center justify-center gap-3">
      <div className="flex flex-1 flex-wrap items-center justify-center gap-3">
        {phase === 'waiting' && (
          <>
            <Button variant="secondary" onClick={props.onReady}>
              {meReady ? 'Not ready' : 'Ready up'}
            </Button>
            {isHost ? (
              <Button onClick={props.onStart} disabled={!canStart}>
                {canStart
                  ? 'Start game'
                  : needPlayers
                    ? 'Need 2+ players'
                    : 'Waiting for all ready'}
              </Button>
            ) : (
              <span className="font-body text-small text-starlight-muted">
                Waiting for the host to start…
              </span>
            )}
          </>
        )}

        {phase === 'swap' &&
          (canSwap ? (
            <>
              <Button onClick={props.onSwap} disabled={props.selectedCount === 0}>
                {props.selectedCount > 0 ? `Swap ${props.selectedCount}` : 'Select cards to swap'}
              </Button>
              <Button variant="secondary" onClick={props.onKeep}>
                Keep cards
              </Button>
              <Button variant="secondary" onClick={props.onResign}>
                Resign
              </Button>
            </>
          ) : (
            <span className="font-body text-small text-starlight-muted">
              Waiting for other players to swap…
            </span>
          ))}

        {phase === 'playing' && (
          <span
            className={`font-body text-small ${isMyTurn ? 'font-semibold text-gold' : 'text-starlight-muted'}`}
          >
            {isMyTurn ? 'Your turn — play a card' : 'Waiting for the current player…'}
          </span>
        )}

        {phase === 'finished' && (
          <div className="flex flex-col items-center gap-2">
            <span className="font-display text-h3 text-gold">
              {props.isWinner ? 'You win!' : `${props.winnerNames.join(', ') || 'Someone'} wins`}
            </span>
            <Button onClick={props.onRematch}>Rematch</Button>
          </div>
        )}
      </div>

      <MuteButton muted={props.muted} onClick={props.onToggleMute} />
    </div>
  );
}
