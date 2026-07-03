import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@muushig/shared';
import { MAX_CONSECUTIVE_FOLDS } from '@muushig/shared';
import type { CardVM, SeatVM, TrickPlayVM, Phase } from '../game/types';
import { cardKey, legalMoves } from '../game/legalMoves';
import { botAvatar } from '../game/avatars';
import { Seat } from './Seat';
import { Scoreboard } from './Scoreboard';
import { RoundSummary, type RoundRow } from './RoundSummary';
import { Celebration } from './Celebration';
import { ScoreSheet } from './ScoreSheet';
import { PipView } from './PipView';
import { Trick } from './Trick';
import {
  useLayoutMode,
  useThermalThrottle,
  useSpeaking,
  setRichPresence,
  openInvite,
  isEmbedded,
} from '../discord';
import { TrumpIndicator } from './TrumpIndicator';
import { Hand } from './Hand';
import { ActionBar } from './ActionBar';
import { TitleBanner } from './TitleBanner';
import { initAudio, isMuted, play as playSfx, toggleMuted } from '../audio/sound';
import { t, useLocale } from '../i18n';

interface Props {
  state: GameState;
  sessionId: string | null;
  send: (type: string, payload?: unknown) => void;
}

const MIN_PLAYERS = 2;

/**
 * Where each opponent placard sits around the felt, as %{left,top} of the arena.
 * Slots run left → right across the top arc; "me" always sits at the near (bottom)
 * edge, so opponents fill them in turn order and the rotation (turn, dealer,
 * amankhuzuu) reads me (bottom) → left → top → right → back to me.
 */
const RING_SLOTS: Record<number, Array<{ left: number; top: number }>> = {
  1: [{ left: 50, top: -12 }],
  2: [
    { left: 18, top: -8 },
    { left: 82, top: -8 },
  ],
  3: [
    { left: -10, top: 32 },
    { left: 50, top: -16 },
    { left: 110, top: 32 },
  ],
  4: [
    { left: -12, top: 40 },
    { left: 22, top: -16 },
    { left: 78, top: -16 },
    { left: 112, top: 40 },
  ],
};

/**
 * Portrait (phone) seat slots: the felt is a TALL oval, so opponents run up the
 * left side, across the top, and down the right — me (bottom) → left → top →
 * right, the same clockwise order as the wide layout.
 */
const PORTRAIT_RING_SLOTS: Record<number, Array<{ left: number; top: number }>> = {
  1: [{ left: 50, top: 6 }],
  2: [
    { left: 14, top: 20 },
    { left: 86, top: 20 },
  ],
  3: [
    { left: 8, top: 40 },
    { left: 50, top: 4 },
    { left: 92, top: 40 },
  ],
  4: [
    { left: 8, top: 56 },
    { left: 18, top: 16 },
    { left: 82, top: 16 },
    { left: 92, top: 56 },
  ],
};

type Slots = Record<number, Array<{ left: number; top: number }>>;

function ringSlot(slots: Slots, n: number, i: number): { left: number; top: number } {
  const arr = slots[n];
  if (arr?.[i]) return arr[i];
  const t = n <= 1 ? 0.5 : i / (n - 1);
  return { left: -10 + t * 120, top: -10 };
}

/** True on phone-width viewports (< Tailwind `sm`), used to pick the portrait felt + seats. */
function useIsCompact(): boolean {
  const query = '(max-width: 639px)';
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

/** Vector drawing of a traditional Mongolian infinity knot (Ulzii) */
function UlziiKnotSVG() {
  return (
    <g
      stroke="#c8962a"
      strokeWidth="4.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#handDrawn)"
    >
      <path d="M -20,0 L 0,-20 L 20,0 L 0,20 Z" />
      <path d="M -40,-20 L -20,-40 L 0,-20 M 0,-20 L 20,-40 L 40,-20" />
      <path d="M -40,20 L -20,40 L 0,20 M 0,20 L 20,40 L 40,20" />
      <path d="M -20,-40 L 0,-60 L 20,-40 M -20,40 L 0,60 L 20,40" />
      <path d="M -40,-20 L -60,0 L -40,20 M 40,-20 L 60,0 L 40,20" />
      <path d="M -60,0 L -40,-20 L -20,0 L -40,20 L -60,0" />
      <path d="M 60,0 L 40,-20 L 20,0 L 40,20 L 60,0" />
    </g>
  );
}

/** Vector drawing of a rolled parchment scroll table prop */
function TableScrollProp() {
  return (
    <div className="absolute bottom-5 left-12 h-10 w-16 -rotate-15 pointer-events-none select-none z-10">
      <svg
        className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]"
        viewBox="0 0 80 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g filter="url(#handDrawn)">
          {/* Scroll rolls */}
          <path
            d="M 5,20 L 70,12 C 75,12 75,28 70,28 L 5,36 Z"
            fill="#f5e6d3"
            stroke="#3a2a1e"
            strokeWidth="1.8"
          />
          <path
            d="M 8,16 L 72,9 C 77,9 77,22 72,22 L 8,29 Z"
            fill="#e7d2b3"
            stroke="#3a2a1e"
            strokeWidth="1.8"
          />
          {/* Ribbon tie */}
          <rect
            x="35"
            y="14"
            width="7"
            height="15"
            fill="#a33b2a"
            stroke="#3a2a1e"
            strokeWidth="1.5"
            rx="1.5"
          />
          <path
            d="M 38,29 Q 36,38 31,41 M 38,29 Q 41,38 44,40"
            stroke="#a33b2a"
            strokeWidth="1.5"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}

/** Vector drawing of a carved drinking horn cup table prop */
function DrinkingHornProp() {
  return (
    <div className="absolute bottom-4 right-14 h-11 w-16 rotate-15 pointer-events-none select-none z-10">
      <svg
        className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]"
        viewBox="0 0 80 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g filter="url(#handDrawn)">
          {/* Horn body */}
          <path
            d="M 12,10 C 26,5 56,18 66,36 C 66,36 53,42 46,34 C 36,24 22,19 12,10 Z"
            fill="#f5e6d3"
            stroke="#3a2a1e"
            strokeWidth="1.8"
          />
          {/* Metal band accent at opening */}
          <ellipse
            cx="13"
            cy="11"
            rx="3.5"
            ry="5.5"
            fill="#c8962a"
            stroke="#3a2a1e"
            strokeWidth="1.5"
            transform="rotate(-30, 13, 11)"
          />
          {/* Band details */}
          <path d="M 48,30 C 50,33 53,34 56,33" stroke="#c8962a" strokeWidth="1.8" fill="none" />
          <path d="M 61,34 Q 64,36 66,36" stroke="#c8962a" strokeWidth="1.8" fill="none" />
        </g>
      </svg>
    </div>
  );
}

/** Marble message panel centered on the table */
function MessagePanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="relative flex h-[146px] w-[min(256px,82vw)] -rotate-1 flex-col items-center justify-center rounded-[8px] border-2 border-[#c9a56e] bg-parchment px-5 py-4 text-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.55)] [box-shadow:inset_0_0_18px_rgba(120,80,40,0.2)]">
      <div className="relative z-10 flex select-none flex-col items-center justify-center">
        <p className="font-hand text-3xl font-bold leading-none text-ink">{title}</p>
        <p className="mt-1 font-hand text-xl leading-tight text-ink-soft">{subtitle}</p>
      </div>
    </div>
  );
}

export function Table({ state, sessionId, send }: Props) {
  const phase = state.phase as Phase;
  useLocale(); // re-render the whole table when the language flips
  const isCompact = useIsCompact();
  const ringSlots = isCompact ? PORTRAIT_RING_SLOTS : RING_SLOTS;
  const layoutMode = useLayoutMode();
  useThermalThrottle();
  const speaking = useSpeaking();

  // ── Derive plain view-models from the synced schema ──
  const seats: SeatVM[] = [];
  state.seatOrder.forEach((id, index) => {
    const p = state.players.get(id);
    seats.push({
      id,
      username: p?.username ?? 'Player',
      // Ignore Discord photographic avatars to keep the board-game storybook look.
      avatarUrl: botAvatar(index) || '',
      score: p?.score ?? 15,
      scoreLog: p ? [...p.scoreLog].map((c) => c ?? '') : [],
      tricksWon: p?.tricksWon ?? 0,
      handCount: p?.hand.length ?? 0,
      isReady: p?.isReady ?? false,
      isHost: id === state.hostId,
      isTurn:
        state.currentTurn === id &&
        (phase === 'decision' || phase === 'swap' || phase === 'playing'),
      hasDecided: p?.hasDecided ?? false,
      hasResigned: p?.hasResigned ?? false,
      isConnected: p?.isConnected ?? true,
      isBot: p?.isBot ?? false,
      isMe: id === sessionId,
      isSpeaking: !!p?.discordId && speaking.has(p.discordId),
      isDealer: id === state.dealerId,
      isAmankhuzuu: id === state.amankhuzuuId,
      seatNumber: index + 1,
    });
  });

  const meRaw = sessionId ? state.players.get(sessionId) : null;
  const myHand: CardVM[] = [];
  meRaw?.hand.forEach((c) => myHand.push({ suit: c.suit, rank: c.rank }));

  const trick: TrickPlayVM[] = [];
  state.currentTrick.forEach((tp) =>
    trick.push({
      playerId: tp.playerId,
      username: state.players.get(tp.playerId)?.username ?? '',
      card: { suit: tp.card.suit, rank: tp.card.rank },
    }),
  );

  const trumpCard: CardVM | null = state.trumpSuit
    ? { suit: state.trumpCard.suit, rank: state.trumpCard.rank }
    : null;

  const winnerNames: string[] = [];
  let isWinner = false;
  state.winners.forEach((id) => {
    winnerNames.push(state.players.get(id)?.username ?? 'Player');
    if (id === sessionId) isWinner = true;
  });

  const me = seats.find((s) => s.isMe) ?? null;
  // Joined mid-game: watching from the rail until the next game seats them.
  const isSpectator = !!sessionId && !state.players.has(sessionId);
  const spectatorNames: string[] = [];
  state.spectators.forEach((name) => spectatorNames.push(name));
  const isHost = me?.isHost === true;
  const meReady = me?.isReady ?? false;
  const allReady = seats.length > 0 && seats.every((s) => s.isReady);
  const canStart = isHost && seats.length >= MIN_PLAYERS && allReady;
  const meDecided = meRaw?.hasDecided ?? false;
  const meSwapped = meRaw?.hasSwapped ?? false;
  const myTurn = state.currentTurn === sessionId;
  // Decision and swap now go in turn order (clockwise from the amankhuzuu).
  const canDecide = phase === 'decision' && myTurn && !meDecided;
  // Haranhui oroh: after the fold cap, this player must play (fold is blocked).
  const mustPlay = (meRaw?.consecutiveFolds ?? 0) >= MAX_CONSECUTIVE_FOLDS;
  const canSwap = phase === 'swap' && !!meRaw && !meSwapped && !meRaw.hasResigned && myTurn;
  const isMyTurn = phase === 'playing' && myTurn;
  // The dealer may exchange the face-up trump card for one of their cards, any
  // time before play; the trump suit stays locked.
  // Navshih (the dealer's trump exchange) is a swap-phase-only action — the
  // engine/server reject it in any other phase, so only offer it then.
  const canSwapTrump =
    !!me?.isDealer && !state.trumpExchanged && phase === 'swap' && !(meRaw?.hasResigned ?? false);

  const handKeysJoined = myHand.map(cardKey).join(',');
  const trickKeysJoined = trick.map((t) => cardKey(t.card)).join(',');
  const legalKeys = useMemo(
    () => new Set(legalMoves(myHand, trick, state.ledSuit, state.trumpSuit).map(cardKey)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handKeysJoined, trickKeysJoined, state.ledSuit, state.trumpSuit],
  );

  // ── Selection (swap phase) ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (phase !== 'swap') setSelected(new Set());
  }, [phase]);

  // ── Dealer's trump-card exchange ──
  const [trumpSwapMode, setTrumpSwapMode] = useState(false);
  useEffect(() => {
    if (!canSwapTrump) setTrumpSwapMode(false);
  }, [canSwapTrump]);

  // You may swap at most 5, and never more than the cards left in the stock.
  const swapMax = Math.min(5, state.stock.length);
  const onToggleSelect = useCallback(
    (c: CardVM) => {
      const key = cardKey(c);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else if (next.size < swapMax) next.add(key);
        return next;
      });
      playSfx('click');
    },
    [swapMax],
  );

  // ── Actions ──
  const act = (fn: () => void) => {
    initAudio();
    fn();
  };
  const onReady = () => act(() => send('ready'));
  const onStart = () => act(() => send('start'));
  const onAddBot = () => act(() => send('addBot'));
  const onRemoveBot = (id: string) => act(() => send('removeBot', { id }));
  const onStay = () => act(() => send('stay'));
  const onKeep = () => act(() => send('swap', { indices: [] }));
  const onResign = () => act(() => send('resign'));
  const onRematch = () => act(() => send('rematch'));
  const onPlay = (c: CardVM) => act(() => send('playCard', { suit: c.suit, rank: c.rank }));
  const onPickTrump = (index: number) =>
    act(() => {
      send('exchangeTrump', { index });
      setTrumpSwapMode(false);
    });
  const onSwap = () =>
    act(() => {
      const indices: number[] = [];
      myHand.forEach((c, i) => {
        if (selected.has(cardKey(c))) indices.push(i);
      });
      send('swap', { indices });
      setSelected(new Set());
    });

  const [showSheet, setShowSheet] = useState(false);
  const [muted, setMuted] = useState(isMuted());
  const onToggleMute = () => {
    const m = toggleMuted();
    setMuted(m);
    if (!m) {
      initAudio();
      playSfx('click');
    }
  };

  // ── Sound effects driven by state transitions ──
  const trickLen = trick.length;
  const tricksPlayed = state.tricksPlayed;
  const winnersLen = winnerNames.length;
  const prev = useRef({ phase, trickLen, tricksPlayed, isMyTurn, winnersLen, init: false });
  useEffect(() => {
    const p = prev.current;
    if (p.init) {
      if (phase === 'decision' && p.phase === 'waiting') {
        playSfx('deal');
        window.setTimeout(() => playSfx('trump'), 350);
      }
      if (trickLen > p.trickLen) playSfx('play');
      if (tricksPlayed > p.tricksPlayed) playSfx('trick');
      if (isMyTurn && !p.isMyTurn) playSfx('turn');
      if (winnersLen > p.winnersLen) playSfx(isWinner ? 'win' : 'lose');
    }
    prev.current = { phase, trickLen, tricksPlayed, isMyTurn, winnersLen, init: true };
  }, [phase, trickLen, tricksPlayed, isMyTurn, winnersLen, isWinner]);

  // ── Round-end summary ──
  // The server pauses between scoring and the next deal; a new scoreLog entry
  // marks that moment, so this works for spectators and reconnects too.
  const roundsLogged = seats.reduce((m, s) => Math.max(m, s.scoreLog.length), 0);
  const [summary, setSummary] = useState<RoundRow[] | null>(null);
  const prevRounds = useRef(roundsLogged);
  useEffect(() => {
    const prev = prevRounds.current;
    prevRounds.current = roundsLogged;
    if (roundsLogged === 0 || roundsLogged <= prev) return;
    setSummary(
      seats.map((s) => ({
        id: s.id,
        username: s.username,
        folded: s.scoreLog[s.scoreLog.length - 1] === '-',
        tricksWon: s.tricksWon,
        total: s.score,
      })),
    );
    const t = window.setTimeout(() => setSummary(null), 3600);
    return () => window.clearTimeout(t);
    // seats is rebuilt every render; the log length is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundsLogged]);

  // Opponents in turn order after me (their seatOrder sequence). They fill the
  // ring left → top → right so rotation reads me (bottom) → left → top → right
  // → back to me: the amankhuzuu (next after me) sits to my screen-left.
  const meIdx = seats.findIndex((s) => s.isMe);
  const opponents =
    meIdx >= 0
      ? [...seats.slice(meIdx + 1), ...seats.slice(0, meIdx)]
      : seats.filter((s) => !s.isMe);

  // Rich Presence on the friends list — updates only when phase/score changes.
  const myScore = me?.score ?? 15;
  useEffect(() => {
    void setRichPresence(
      'Muushig',
      phase === 'waiting'
        ? 'In the lobby'
        : phase === 'finished'
          ? 'Game over'
          : `Playing · Score ${myScore}`,
    );
  }, [phase, myScore]);

  // Picture-in-Picture: shed the board for a tiny read-only summary.
  if (layoutMode === 'pip') {
    const turnSeat = seats.find((s) => s.id === state.currentTurn);
    return (
      <div className="flex min-h-full w-full items-center justify-center px-2 pt-[max(0.25rem,var(--safe-top))] pb-[max(0.25rem,var(--safe-bottom))]">
        <PipView
          seats={seats}
          phase={phase}
          isMyTurn={isMyTurn}
          turnName={turnSeat?.username ?? ''}
          ledSuit={state.ledSuit}
          trumpSuit={state.trumpSuit}
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-4xl flex-col gap-3 px-3 pt-[max(0.5rem,var(--safe-top))] pb-[max(0.75rem,var(--safe-bottom))] select-none sm:gap-4">
      <TitleBanner />
      <Scoreboard seats={seats} onOpenSheet={() => setShowSheet(true)} />
      {spectatorNames.length > 0 && (
        <p
          className="z-10 -mt-1 text-center font-hand text-sm text-cream/70"
          title={spectatorNames.join(', ')}
        >
          {t('watchingCount', { n: spectatorNames.length })}
        </p>
      )}

      {/* The table arena. On phones the felt is a tall, height-driven oval so
          opponents seat down the sides; on sm+ it's the wide landscape felt.
          min-h-0 lets it shrink so the hand and action bar always fit. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center py-1 sm:py-2">
        <div className="relative mx-auto aspect-[5/6] w-full max-w-md sm:aspect-[7/4] sm:max-w-3xl">
          {/* CSS teal felt table top (no image) */}
          <div
            className="absolute inset-0 z-0 rounded-[42%/48%] border-[6px] border-[#6b4a2f] drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)] sm:rounded-[46%/40%]"
            style={{
              background:
                'radial-gradient(circle at 50% 42%, #3aa0a0 0%, #2e8c8c 55%, #1f6f6f 100%)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.35)',
            }}
          />

          {/* Decorative props — desktop only; they crowd the narrow portrait felt. */}
          {!isCompact && (
            <>
              <TableScrollProp />
              <DrinkingHornProp />
            </>
          )}

          {/* Center of the table: trump card + the trick in progress. */}
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-3 px-3 sm:gap-4 sm:px-6">
            {phase === 'waiting' ? (
              <MessagePanel title={t('pullUpStool')} subtitle={t('readyUpSubtitle')} />
            ) : (
              <>
                {trumpCard && <TrumpIndicator card={trumpCard} revealed={phase === 'decision'} />}
                {trumpSwapMode && (
                  <p className="z-30 select-none font-hand text-base font-bold text-cream drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    {t('tapCardForTrump')}
                  </p>
                )}
                <Trick plays={trick} trumpSuit={state.trumpSuit} />
              </>
            )}
          </div>

          {/* Opponents seated around the rim of the felt. */}
          {opponents.map((s, i) => {
            const pos = ringSlot(ringSlots, opponents.length, i);
            const opponentSeatNum = i + 2;
            return (
              <div
                key={s.id}
                className="absolute z-10 origin-center -translate-x-1/2 -translate-y-1/2 scale-[0.78] sm:scale-100"
                style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              >
                <Seat
                  seat={s}
                  phase={phase}
                  compact
                  seatNumber={opponentSeatNum}
                  onRemove={
                    isHost && phase === 'waiting' && s.isBot ? () => onRemoveBot(s.id) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {me && <Seat seat={me} phase={phase} seatNumber={1} />}
        <Hand
          cards={myHand}
          phase={phase}
          trumpSuit={state.trumpSuit}
          isMyTurn={isMyTurn}
          canSwap={canSwap}
          legalKeys={legalKeys}
          selectedKeys={selected}
          onToggleSelect={onToggleSelect}
          onPlay={onPlay}
          trumpSwapMode={trumpSwapMode}
          onPickTrump={onPickTrump}
        />
        <ActionBar
          phase={phase}
          isSpectator={isSpectator}
          isHost={isHost}
          canStart={canStart}
          meReady={meReady}
          needPlayers={seats.length < MIN_PLAYERS}
          meDecided={meDecided}
          canDecide={canDecide}
          mustPlay={mustPlay}
          canSwap={canSwap}
          meSwapped={meSwapped}
          isMyTurn={isMyTurn}
          selectedCount={selected.size}
          canSwapTrump={canSwapTrump}
          trumpSwapMode={trumpSwapMode}
          canInvite={isEmbedded}
          canAddBot={isHost && phase === 'waiting' && seats.length < state.maxPlayers}
          winnerNames={winnerNames}
          isWinner={isWinner}
          muted={muted}
          onReady={onReady}
          onStart={onStart}
          onAddBot={onAddBot}
          onStay={onStay}
          onSwap={onSwap}
          onKeep={onKeep}
          onResign={onResign}
          onRematch={onRematch}
          onToggleTrumpSwap={() => setTrumpSwapMode((v) => !v)}
          onInvite={() => void openInvite()}
          onToggleMute={onToggleMute}
        />
      </div>

      {showSheet && <ScoreSheet seats={seats} onClose={() => setShowSheet(false)} />}

      {phase === 'finished' && winnerNames.length > 0 ? (
        <Celebration winnerNames={winnerNames} />
      ) : (
        summary && <RoundSummary rows={summary} />
      )}
    </div>
  );
}
