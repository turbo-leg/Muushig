import type { CSSProperties } from 'react';
import type { SeatVM, Phase } from '../game/types';

interface Props {
  seat: SeatVM;
  phase: Phase;
  /** Smaller placard for the opponents seated around the table edge. */
  compact?: boolean;
  seatNumber?: number;
  /** Host-only in the lobby: removes this bot's seat. */
  onRemove?: () => void;
}

function statusLabel(seat: SeatVM, phase: Phase): { text: string; cls: string } | null {
  // A held seat (reconnection window) trumps any phase status. Once a bot
  // takes the seat over it plays on, so show that instead of an endless wait.
  if (phase !== 'waiting' && !seat.isConnected) {
    return seat.isBot
      ? { text: 'Bot', cls: 'text-ink-soft' }
      : { text: 'Reconnecting…', cls: 'text-danger' };
  }
  if (phase === 'waiting') {
    return seat.isReady
      ? { text: 'Ready', cls: 'text-success' }
      : { text: 'Waiting', cls: 'text-ink-soft' };
  }
  if (phase === 'decision') {
    if (seat.hasResigned) return { text: 'Fold', cls: 'text-danger' };
    return seat.hasDecided
      ? { text: 'Bid', cls: 'text-success' }
      : { text: 'Bidding…', cls: 'text-ink-soft' };
  }
  if (seat.hasResigned) return { text: 'Fold', cls: 'text-danger' };
  if (phase === 'playing' && seat.isTurn) return { text: 'Turn', cls: 'text-amber-deep font-bold' };
  return null;
}

/** A small chip marking a player's round role: dealer button / amankhuzuu. */
function RoleBadge({ kind }: { kind: 'dealer' | 'amankhuzuu' }) {
  const dealer = kind === 'dealer';
  return (
    <span
      title={dealer ? 'Dealer' : 'Amankhuzuu — first to swap'}
      className={[
        'grid h-5 min-w-5 select-none place-items-center rounded-full px-1 font-hand text-[10px] font-bold leading-none shadow-sm',
        'border border-ink/40 ring-1 ring-black/5 z-20',
        dealer ? 'bg-parchment text-wood' : 'bg-amber text-ink',
      ].join(' ')}
    >
      {dealer ? 'D' : 'АМ'}
    </span>
  );
}

/** Vector drawing of a bronze seat number badge */
function SeatNumberBadge({ num }: { num: number }) {
  return (
    <svg
      className="absolute -left-2 -top-2.5 z-30 h-7 w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] select-none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={`bronzeCoin-${num}`} cx="35%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#f2d184" />
          <stop offset="50%" stopColor="#d98e04" />
          <stop offset="100%" stopColor="#8a5a02" />
        </radialGradient>
      </defs>
      <circle
        cx="16"
        cy="16"
        r="14"
        fill={`url(#bronzeCoin-${num})`}
        stroke="#3a2a1e"
        strokeWidth="1.8"
      />
      <circle
        cx="16"
        cy="16"
        r="11"
        fill="none"
        stroke="#f5e6d3"
        strokeWidth="0.75"
        strokeDasharray="2 1.5"
        opacity="0.6"
      />
      <text
        x="16"
        y="21.5"
        fontFamily="var(--font-hand)"
        fontSize="17"
        fontWeight="bold"
        fill="#3a2a1e"
        textAnchor="middle"
      >
        {num}
      </text>
    </svg>
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
 * A player/bot placard rendered with a hand-drawn vector wood/metal plate shape.
 */
export function Seat({ seat, phase, seatNumber, onRemove }: Props) {
  const status = statusLabel(seat, phase);
  const actualSeatNumber = seatNumber ?? seat.seatNumber;

  const w = seat.isMe ? 198 : 156;
  const h = 64;

  // Hand-drawn asymmetric bezier curves for placard borders
  const d1 = `M 6,5 Q ${w / 2},7 ${w - 6},5 Q ${w - 4},${h / 2} ${w - 6},${h - 5} Q ${w / 2},${h - 7} 6,${h - 5} Q 4,${h / 2} 6,5 Z`;
  const d2 = `M 10,9 Q ${w / 2},11 ${w - 10},9 Q ${w - 8},${h / 2} ${w - 10},${h - 9} Q ${w / 2},${h - 11} 10,${h - 9} Q 8,${h / 2} 10,9 Z`;

  const avatarStyle: CSSProperties = seat.avatarUrl
    ? {
        backgroundImage: `url("${seat.avatarUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  return (
    <div
      className={`relative flex items-center justify-start ${
        seat.isSpeaking
          ? 'anim-speaking rounded-[10px]'
          : seat.isTurn
            ? 'anim-turn rounded-[10px]'
            : ''
      } ${seat.hasResigned || (!seat.isConnected && !seat.isBot) ? 'opacity-55' : ''}`}
      style={{ width: `${w}px`, height: `${h}px` }}
    >
      {/* CSS placard backing (no image) */}
      <div
        className={`absolute inset-0 pointer-events-none rounded-[10px] border-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)] ${
          seat.isMe ? 'border-amber-deep' : 'border-[#7a5a42]'
        }`}
        style={{
          background: seat.isMe
            ? 'linear-gradient(180deg, #f5e6d3, #e2c79f)'
            : 'linear-gradient(180deg, #e7d2b3, #cdb088)',
          boxShadow: 'inset 0 0 12px rgba(120,80,40,0.25)',
        }}
      />

      {/* Seat-number token (top-left) */}
      {actualSeatNumber != null && <SeatNumberBadge num={actualSeatNumber} />}

      {/* Host-only: dismiss a lobby bot */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${seat.username}`}
          className="absolute -right-2 -top-2.5 z-30 grid h-6 w-6 place-items-center rounded-full border border-ink/50 bg-parchment font-hand text-sm font-bold leading-none text-danger shadow-sm hover:bg-parchment-deep"
        >
          ✕
        </button>
      )}

      {/* Role badges (top-right) */}
      {(seat.isDealer || seat.isAmankhuzuu) && (
        <div className="absolute -right-1 -top-1.5 z-30 flex gap-1 select-none">
          {seat.isAmankhuzuu && <RoleBadge kind="amankhuzuu" />}
          {seat.isDealer && <RoleBadge kind="dealer" />}
        </div>
      )}

      {/* Contents arranged horizontally and aligned to vector coordinates */}
      <div className="absolute inset-0 z-10 flex items-center select-none pointer-events-none">
        {/* Left: Avatar portrait inside gold circle */}
        <div
          className="absolute left-[14px] top-[10px] h-[44px] w-[44px] rounded-full border border-ink bg-parchment-deep overflow-hidden flex items-center justify-center font-hand text-wood"
          style={avatarStyle}
        >
          {!seat.avatarUrl && (
            <span className="text-xl font-bold leading-none">
              {seat.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Right: User stats inside parchment box */}
        <div
          className="absolute left-[72px] top-[10px] bottom-[10px] flex flex-col justify-center leading-none"
          style={{ width: `${w - 86}px` }}
        >
          <div className="flex items-center gap-1">
            <span className="font-hand text-[15px] font-bold text-ink truncate leading-tight max-w-[85%]">
              {seat.username}
            </span>
            {seat.isHost && (
              <span className="text-amber-deep text-xs leading-none" title="Room Host">
                ★
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 leading-none">
            <div className="flex items-center gap-0.5">
              <ScoreCoinSVG />
              <span className="num font-hand text-[14px] font-bold text-wood">{seat.score}</span>
            </div>
            {status && (
              <span
                className={`font-hand text-[10px] font-bold uppercase tracking-wider ${status.cls}`}
              >
                {status.text}
              </span>
            )}
            {seat.isMe && (
              <span className="font-hand text-[10px] text-ink-soft opacity-75">(you)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
