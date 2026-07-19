import type { CSSProperties } from 'react';
import type { SeatVM, Phase } from '../game/types';
import { t } from '../i18n';

interface Props {
  seat: SeatVM;
  phase: Phase;
  /** Host-only in the lobby: removes a bot instantly; kicks a human (two taps). */
  onRemove?: () => void;
  /** A human kick is armed — the next tap confirms it. */
  removeArmed?: boolean;
}

/** The single status chip overlapping the avatar. Null = nothing to say. */
function statusPill(
  seat: SeatVM,
  phase: Phase,
): { glyph: string; label: string; cls: string } | null {
  // A held seat (reconnection window) trumps any phase status; a bot takeover
  // plays on silently.
  if (phase !== 'waiting' && !seat.isConnected) {
    return seat.isBot
      ? null
      : { glyph: '↻', label: t('seatReconnecting'), cls: 'bg-danger text-cream' };
  }
  if (phase === 'waiting') {
    return seat.isReady
      ? { glyph: '✓', label: t('seatReady'), cls: 'bg-success text-[#0c1f10]' }
      : null;
  }
  if (seat.hasResigned) return { glyph: '✕', label: t('seatFold'), cls: 'bg-danger text-cream' };
  if (phase === 'decision') {
    return seat.hasDecided
      ? { glyph: '✓', label: t('seatBid'), cls: 'bg-success text-[#0c1f10]' }
      : { glyph: '…', label: t('seatBidding'), cls: 'bg-parchment text-ink-soft' };
  }
  if (phase === 'swap') {
    return seat.hasSwapped
      ? { glyph: '⇄', label: t('seatSwapped'), cls: 'bg-success text-[#0c1f10]' }
      : { glyph: '…', label: t('seatBidding'), cls: 'bg-parchment text-ink-soft' };
  }
  return null; // playing: the turn ring says it all
}

/** A small chip marking a player's round role: dealer button / amankhuzuu. */
function RoleBadge({ kind }: { kind: 'dealer' | 'amankhuzuu' }) {
  const dealer = kind === 'dealer';
  return (
    <span
      title={dealer ? t('dealerTooltip') : t('amankhuzuuTooltip')}
      className={[
        'grid h-4.5 min-w-4.5 select-none place-items-center rounded-full px-0.5 font-hand text-[9px] font-bold leading-none shadow-sm',
        'border border-ink/40 z-20',
        dealer ? 'bg-parchment text-ember' : 'bg-amber text-[#1d1503]',
      ].join(' ')}
    >
      {dealer ? 'D' : 'АМ'}
    </span>
  );
}

/** Vector drawing of a single score counter coin */
function ScoreCoinSVG() {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0 select-none"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="goldCoinGrad" cx="35%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#f2d184" />
          <stop offset="60%" stopColor="#d98e04" />
          <stop offset="100%" stopColor="#8a5a02" />
        </radialGradient>
      </defs>
      <circle cx="10" cy="10" r="9" fill="url(#goldCoinGrad)" stroke="#3a2a1e" strokeWidth="1.5" />
      <circle
        cx="10"
        cy="10"
        r="6.5"
        fill="none"
        stroke="#3a2a1e"
        strokeWidth="0.5"
        strokeDasharray="1.5 1"
        opacity="0.4"
      />
      <path
        d="M 8,10 L 12,10 M 10,8 L 10,12"
        stroke="#3a2a1e"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

/**
 * A seat is a bare avatar stack floating on the felt (no placard): ringed
 * avatar + one status chip, then score and name as plain text. Everything
 * else (turn, voice, fold) is carried by the ring, the chip, and dimming.
 */
export function Seat({ seat, phase, onRemove, removeArmed }: Props) {
  const pill = statusPill(seat, phase);
  const dim = seat.hasResigned || (!seat.isConnected && !seat.isBot);

  const avatarStyle: CSSProperties = seat.avatarUrl
    ? {
        backgroundImage: `url("${seat.avatarUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  return (
    <div className={`relative flex flex-col items-center select-none ${dim ? 'opacity-55' : ''}`}>
      <div className="relative">
        <div
          className={[
            'flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 bg-parchment-deep font-hand text-ember',
            seat.isMe ? 'border-amber-deep' : 'border-gild/70',
            seat.isSpeaking ? 'anim-speaking' : seat.isTurn ? 'anim-turn' : '',
          ].join(' ')}
          style={avatarStyle}
        >
          {!seat.avatarUrl && (
            <span className="text-xl font-bold leading-none">
              {seat.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Round roles on the rim (unique info: dealer / amankhuzuu) */}
        {(seat.isDealer || seat.isAmankhuzuu) && (
          <div className="absolute -left-1.5 -top-1 z-20 flex flex-col gap-0.5">
            {seat.isAmankhuzuu && <RoleBadge kind="amankhuzuu" />}
            {seat.isDealer && <RoleBadge kind="dealer" />}
          </div>
        )}

        {/* Dying Ace indicator (Үхсэн тамга) */}
        {seat.trumpAceDead && (
          <div
            title={t('deadAceTooltip')}
            className="absolute -right-1.5 -top-1 z-20 grid h-5 w-5 select-none place-items-center rounded-full border border-danger/60 bg-parchment-deep text-[10px] shadow-sm animate-pulse"
          >
            ☠️
          </div>
        )}

        {/* Host-only: dismiss a lobby bot / kick a human (armed = second tap fires) */}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={
              removeArmed
                ? t('confirmKick', { name: seat.username })
                : t('removeSeat', { name: seat.username })
            }
            title={removeArmed ? t('confirmKick', { name: seat.username }) : undefined}
            className={`absolute -right-1.5 -top-1 z-30 grid h-5 w-5 place-items-center rounded-full border font-hand text-xs font-bold leading-none shadow-sm ${
              removeArmed
                ? 'border-danger bg-danger text-cream'
                : 'border-ink/50 bg-parchment text-danger hover:bg-parchment-deep'
            }`}
          >
            ✕
          </button>
        )}

        {/* The one status chip, overlapping the avatar's bottom edge */}
        {pill && (
          <span
            title={pill.label}
            aria-label={pill.label}
            className={`absolute -bottom-1.5 left-1/2 z-20 grid h-5 min-w-5 -translate-x-1/2 place-items-center rounded-full border border-black/30 px-1 font-hand text-[11px] font-bold leading-none shadow-sm ${pill.cls}`}
          >
            {pill.glyph}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1 leading-none">
        <ScoreCoinSVG />
        <span className="num font-hand text-[14px] font-bold text-ember drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          {seat.score}
        </span>
      </div>

      {/* On very short screens (landscape phones) position + avatar identify
          the player; the name line gives its pixels to the felt. */}
      <div className="mt-0.5 flex max-w-[96px] items-center gap-0.5 leading-none [@media(max-height:600px)]:hidden">
        <span className="truncate font-hand text-[13px] font-bold text-cream drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          {seat.username}
        </span>
        {seat.isHost && (
          <span className="text-[10px] leading-none text-amber-deep" title={t('hostTooltip')}>
            ★
          </span>
        )}
      </div>
    </div>
  );
}
