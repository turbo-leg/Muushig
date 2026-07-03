import { useRef, useState, type ReactNode } from 'react';
import type { Phase } from '../game/types';
import { Button } from './Button';
import { HoldButton } from './HoldButton';
import { t, tAlt } from '../i18n';

interface Props {
  phase: Phase;
  /** Watching from the rail (joined mid-game) — no actions until reseated. */
  isSpectator: boolean;
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
  /** One-line first-game hint for the current phase (null once experienced). */
  hint: string | null;
  winnerNames: string[];
  isWinner: boolean;
  onReady: () => void;
  onStart: () => void;
  onAddBot: () => void;
  onHelp: () => void;
  onStay: () => void;
  onResign: () => void;
  onSwap: () => void;
  onKeep: () => void;
  onRematch: () => void;
  onToggleTrumpSwap: () => void;
  onInvite: () => void;
  onSettings: () => void;
  onLeaveTable: () => void;
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

/** Opens the how-to-play book. */
function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('helpOpen')}
      className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-ink/40 bg-wood-dark/55 font-hand text-lg font-bold text-cream/70 transition-colors select-none hover:bg-wood/50 hover:text-cream focus-visible:ring-2 focus-visible:ring-amber focus-visible:outline-none"
    >
      ?
    </button>
  );
}

/** Door out of the table. Instant in the lobby; mid-game a second tap confirms. */
function LeaveButton({
  onLeave,
  requireConfirm,
}: {
  onLeave: () => void;
  requireConfirm: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);
  const onClick = () => {
    if (!requireConfirm || armed) {
      if (timer.current) window.clearTimeout(timer.current);
      setArmed(false);
      onLeave();
      return;
    }
    setArmed(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setArmed(false), 2500);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('leaveTable')}
      title={t('leaveTable')}
      className={`grid h-10 w-10 cursor-pointer place-items-center rounded-full border font-hand text-lg transition-colors select-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:outline-none ${
        armed
          ? 'border-danger bg-danger/80 text-cream'
          : 'border-ink/40 bg-wood-dark/55 text-cream/70 hover:bg-wood/50 hover:text-cream'
      }`}
    >
      🚪
    </button>
  );
}

/** Opens the settings modal (audio, language, rules). */
function GearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('openSettings')}
      className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-ink/40 bg-wood-dark/55 font-hand text-lg text-cream/70 transition-colors select-none hover:bg-wood/50 hover:text-cream focus-visible:ring-2 focus-visible:ring-amber focus-visible:outline-none"
    >
      ⚙
    </button>
  );
}

export function ActionBar(props: Props) {
  const { phase, isHost, canStart, meReady, needPlayers, canSwap, isMyTurn } = props;

  if (props.isSpectator) {
    return (
      <div className="flex w-full items-center justify-center gap-3 select-none">
        <StatusScroll>{t('watchingNotice')}</StatusScroll>
        <HelpButton onClick={props.onHelp} />
        <GearButton onClick={props.onSettings} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-1.5 select-none">
      {props.hint && (
        <p className="max-w-[85vw] text-center font-hand text-sm leading-tight text-cream/70">
          💡 {props.hint}
        </p>
      )}
      <div className="flex w-full items-center justify-center gap-3">
        <div className="flex flex-1 flex-wrap items-center justify-center gap-3">
          {phase === 'waiting' && (
            <>
              <Button
                variant="coin"
                sub={meReady ? tAlt('cancel') : tAlt('ready')}
                onClick={props.onReady}
              >
                {meReady ? t('cancel') : t('ready')}
              </Button>
              {isHost ? (
                <Button
                  variant="coin"
                  sub={canStart ? tAlt('deal') : tAlt('wait')}
                  onClick={props.onStart}
                  disabled={!canStart}
                >
                  {canStart ? t('deal') : t('wait')}
                </Button>
              ) : (
                <StatusScroll>{t('waitingHost')}</StatusScroll>
              )}
              {props.canInvite && (
                <Button variant="coin" secondary sub={tAlt('invite')} onClick={props.onInvite}>
                  {t('invite')}
                </Button>
              )}
              {props.canAddBot && (
                <Button variant="coin" secondary sub={tAlt('addBot')} onClick={props.onAddBot}>
                  {t('addBot')}
                </Button>
              )}
            </>
          )}

          {phase === 'decision' &&
            (props.meDecided ? (
              <StatusScroll>{t('waitingOthers')}</StatusScroll>
            ) : props.canDecide ? (
              <>
                <Button variant="coin" sub={tAlt('bid')} onClick={props.onStay}>
                  {t('bid')}
                </Button>
                {props.mustPlay ? (
                  <StatusScroll>
                    <span className="text-danger">{t('mustPlay')}</span>
                  </StatusScroll>
                ) : (
                  <HoldButton onConfirm={props.onResign} sub={tAlt('fold')}>
                    {t('fold')}
                  </HoldButton>
                )}
              </>
            ) : (
              <StatusScroll>{t('waitingTurn')}</StatusScroll>
            ))}

          {phase === 'swap' &&
            (canSwap ? (
              <>
                <Button
                  variant="coin"
                  sub={tAlt('swap')}
                  onClick={props.onSwap}
                  disabled={props.selectedCount === 0}
                >
                  {props.selectedCount > 0 ? t('swapN', { n: props.selectedCount }) : t('swap')}
                </Button>
                <Button variant="coin" secondary sub={tAlt('keep')} onClick={props.onKeep}>
                  {t('keep')}
                </Button>
              </>
            ) : props.meSwapped ? (
              <StatusScroll>{t('waitingOthersSwap')}</StatusScroll>
            ) : (
              <StatusScroll>{t('waitingTurnSwap')}</StatusScroll>
            ))}

          {phase === 'playing' && (
            <StatusScroll>
              <span className={isMyTurn ? 'text-amber-deep font-bold' : ''}>
                {isMyTurn ? t('yourTurnThrow') : t('waitingCurrent')}
              </span>
            </StatusScroll>
          )}

          {phase === 'finished' && (
            <div className="flex flex-col items-center gap-2">
              <StatusScroll>
                <span className="text-amber-deep font-bold">
                  {props.isWinner
                    ? t('youWin')
                    : t('playerWins', { names: props.winnerNames.join(', ') || t('someone') })}
                </span>
              </StatusScroll>
              <Button variant="coin" sub={tAlt('again')} onClick={props.onRematch} className="mt-1">
                {t('again')}
              </Button>
            </div>
          )}

          {/* The dealer's trump-card exchange (navshih), sitting beside the
            phase's regular actions during the decision and swap phases. */}
          {props.canSwapTrump && (
            <Button
              variant="coin"
              secondary={props.trumpSwapMode}
              sub={props.trumpSwapMode ? tAlt('cancel') : tAlt('navshih')}
              onClick={props.onToggleTrumpSwap}
            >
              {props.trumpSwapMode ? t('cancel') : t('navshih')}
            </Button>
          )}
        </div>

        <HelpButton onClick={props.onHelp} />
        <GearButton onClick={props.onSettings} />
        <LeaveButton onLeave={props.onLeaveTable} requireConfirm={phase !== 'waiting'} />
      </div>
    </div>
  );
}
