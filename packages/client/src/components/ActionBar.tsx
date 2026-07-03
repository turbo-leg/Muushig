import type { ReactNode } from 'react';
import type { Phase } from '../game/types';
import { Button } from './Button';
import { HoldButton } from './HoldButton';

interface Props {
  phase: Phase;
  isHost: boolean;
  canStart: boolean;
  meReady: boolean;
  needPlayers: boolean;
  meDecided: boolean;
  canDecide: boolean;
  /** Haranhui oroh — the fold cap was hit, so this player must play (no Fold). */
  mustPlay: boolean;
  canSwap: boolean;
  meSwapped: boolean;
  isMyTurn: boolean;
  selectedCount: number;
  /** Dealer may exchange the face-up trump card (navshih) right now. */
  canSwapTrump: boolean;
  /** Dealer has armed navshih and is choosing a hand card to give up. */
  trumpSwapMode: boolean;
  /** Running inside Discord, so the native invite dialog is available. */
  canInvite: boolean;
  /** Host may seat a bot (lobby only, while seats remain). */
  canAddBot: boolean;
  winnerNames: string[];
  isWinner: boolean;
  muted: boolean;
  onReady: () => void;
  onStart: () => void;
  onAddBot: () => void;
  onStay: () => void;
  onResign: () => void;
  onSwap: () => void;
  onKeep: () => void;
  onRematch: () => void;
  onToggleTrumpSwap: () => void;
  onInvite: () => void;
  onToggleMute: () => void;
}

/** Cozy, hand-drawn unrolled parchment scroll strip. */
function StatusScroll({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[50px] min-w-[180px] max-w-[82vw] select-none items-center justify-center rounded-[7px] border-2 border-[#c9a56e] bg-parchment px-5 shadow-[0_3px_6px_rgba(0,0,0,0.3),inset_0_0_14px_rgba(120,80,40,0.18)] sm:min-w-[260px] sm:px-8">
      <span className="relative z-10 mt-0.5 truncate font-hand text-lg font-bold leading-none text-ink">
        {children}
      </span>
    </div>
  );
}

function MuteButton({ muted, onClick }: { muted: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-cream/70 border border-ink/40 bg-wood-dark/55 hover:bg-wood/50 hover:text-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber select-none"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
        {muted ? (
          <path d="m23 9-6 6M17 9l6 6" strokeWidth="2" />
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
    <div className="flex w-full items-center justify-center gap-3 select-none">
      <div className="flex flex-1 flex-wrap items-center justify-center gap-3">
        {phase === 'waiting' && (
          <>
            <Button variant="coin" sub="Бэлэн" onClick={props.onReady}>
              {meReady ? 'Cancel' : 'Ready'}
            </Button>
            {isHost ? (
              <Button
                variant="coin"
                sub={canStart ? 'Хуваах' : 'Хүлээх'}
                onClick={props.onStart}
                disabled={!canStart}
              >
                {canStart ? 'Deal' : 'Wait'}
              </Button>
            ) : (
              <StatusScroll>Waiting for host to deal…</StatusScroll>
            )}
            {props.canInvite && (
              <Button variant="coin" secondary sub="Урих" onClick={props.onInvite}>
                Invite
              </Button>
            )}
            {props.canAddBot && (
              <Button variant="coin" secondary sub="Робот" onClick={props.onAddBot}>
                Add bot
              </Button>
            )}
          </>
        )}

        {phase === 'decision' &&
          (props.meDecided ? (
            <StatusScroll>Waiting for others…</StatusScroll>
          ) : props.canDecide ? (
            <>
              <Button variant="coin" sub="Мөрцөх" onClick={props.onStay}>
                Bid
              </Button>
              {props.mustPlay ? (
                <StatusScroll>
                  <span className="text-danger">Харанхуй орох — must play</span>
                </StatusScroll>
              ) : (
                <HoldButton onConfirm={props.onResign} sub="Дуусгах">
                  Fold
                </HoldButton>
              )}
            </>
          ) : (
            <StatusScroll>Waiting for your turn…</StatusScroll>
          ))}

        {phase === 'swap' &&
          (canSwap ? (
            <>
              <Button
                variant="coin"
                sub="Солих"
                onClick={props.onSwap}
                disabled={props.selectedCount === 0}
              >
                {props.selectedCount > 0 ? `Swap ${props.selectedCount}` : 'Swap'}
              </Button>
              <Button variant="coin" secondary sub="Үлдээх" onClick={props.onKeep}>
                Keep
              </Button>
            </>
          ) : props.meSwapped ? (
            <StatusScroll>Waiting for others to swap…</StatusScroll>
          ) : (
            <StatusScroll>Waiting for your turn to swap…</StatusScroll>
          ))}

        {phase === 'playing' && (
          <StatusScroll>
            <span className={isMyTurn ? 'text-amber-deep font-bold' : ''}>
              {isMyTurn ? 'Your turn — throw a card' : 'Waiting for current player…'}
            </span>
          </StatusScroll>
        )}

        {phase === 'finished' && (
          <div className="flex flex-col items-center gap-2">
            <StatusScroll>
              <span className="text-amber-deep font-bold">
                {props.isWinner ? 'You win!' : `${props.winnerNames.join(', ') || 'Someone'} wins`}
              </span>
            </StatusScroll>
            <Button variant="coin" sub="Дахин" onClick={props.onRematch} className="mt-1">
              Again
            </Button>
          </div>
        )}

        {/* The dealer's trump-card exchange (navshih), sitting beside the
            phase's regular actions during the decision and swap phases. */}
        {props.canSwapTrump && (
          <Button
            variant="coin"
            secondary={props.trumpSwapMode}
            sub={props.trumpSwapMode ? 'Болих' : 'Навших'}
            onClick={props.onToggleTrumpSwap}
          >
            {props.trumpSwapMode ? 'Cancel' : 'Navshih'}
          </Button>
        )}
      </div>

      <MuteButton muted={props.muted} onClick={props.onToggleMute} />
    </div>
  );
}
