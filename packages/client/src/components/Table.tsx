import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@muushig/shared';
import type { CardVM, SeatVM, TrickPlayVM, Phase } from '../game/types';
import { cardKey, legalMoves } from '../game/legalMoves';
import { botAvatar } from '../game/avatars';
import { Seat } from './Seat';
import { Trick } from './Trick';
import { TrumpIndicator } from './TrumpIndicator';
import { Hand } from './Hand';
import { ActionBar } from './ActionBar';
import { TitleBanner } from './TitleBanner';
import { initAudio, isMuted, play as playSfx, toggleMuted } from '../audio/sound';

interface Props {
  state: GameState;
  sessionId: string | null;
  send: (type: string, payload?: unknown) => void;
}

const MIN_PLAYERS = 2;

/**
 * Where each opponent placard sits around the felt, as %{left,top} of the arena.
 * Slots run left → right across the top arc; "me" always sits at the near (bottom)
 * edge, so opponents are ordered clockwise starting from the seat to my left.
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

function ringSlot(n: number, i: number): { left: number; top: number } {
  const slots = RING_SLOTS[n];
  if (slots?.[i]) return slots[i];
  const t = n <= 1 ? 0.5 : i / (n - 1);
  return { left: -10 + t * 120, top: -10 };
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
    <div className="relative flex h-[146px] w-[256px] -rotate-1 flex-col items-center justify-center rounded-[8px] border-2 border-[#c9a56e] bg-parchment px-5 py-4 text-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.55)] [box-shadow:inset_0_0_18px_rgba(120,80,40,0.2)]">
      <div className="relative z-10 flex select-none flex-col items-center justify-center">
        <p className="font-hand text-3xl font-bold leading-none text-ink">{title}</p>
        <p className="mt-1 font-hand text-xl leading-tight text-ink-soft">{subtitle}</p>
      </div>
    </div>
  );
}

export function Table({ state, sessionId, send }: Props) {
  const phase = state.phase as Phase;

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
      tricksWon: p?.tricksWon ?? 0,
      handCount: p?.hand.length ?? 0,
      isReady: p?.isReady ?? false,
      isHost: id === state.hostId,
      isTurn:
        state.currentTurn === id &&
        (phase === 'decision' || phase === 'swap' || phase === 'playing'),
      hasDecided: p?.hasDecided ?? false,
      hasResigned: p?.hasResigned ?? false,
      isMe: id === sessionId,
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
  const isHost = me?.isHost === true;
  const meReady = me?.isReady ?? false;
  const allReady = seats.length > 0 && seats.every((s) => s.isReady);
  const canStart = isHost && seats.length >= MIN_PLAYERS && allReady;
  const meDecided = meRaw?.hasDecided ?? false;
  const meSwapped = meRaw?.hasSwapped ?? false;
  const myTurn = state.currentTurn === sessionId;
  // Decision and swap now go in turn order (clockwise from the amankhuzuu).
  const canDecide = phase === 'decision' && myTurn && !meDecided;
  const canSwap = phase === 'swap' && !!meRaw && !meSwapped && !meRaw.hasResigned && myTurn;
  const isMyTurn = phase === 'playing' && myTurn;
  // The dealer may exchange the face-up trump card for one of their cards, any
  // time before play; the trump suit stays locked.
  const canSwapTrump =
    !!me?.isDealer &&
    !state.trumpExchanged &&
    (phase === 'decision' || phase === 'swap') &&
    !(meRaw?.hasResigned ?? false);

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

  // Opponents in clockwise order starting from the seat to my left, so the ring
  // reads me (bottom) → left → top → right → back to me.
  const meIdx = seats.findIndex((s) => s.isMe);
  const opponents =
    meIdx >= 0
      ? [...seats.slice(meIdx + 1), ...seats.slice(0, meIdx)]
      : seats.filter((s) => !s.isMe);

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-4xl flex-col gap-4 p-3 select-none">
      <TitleBanner />

      {/* The table arena: a centered round felt with players seated around it. */}
      <div className="relative flex flex-1 items-center justify-center py-2">
        <div className="relative aspect-[7/4] w-full max-w-3xl">
          {/* CSS teal felt table top (no image) */}
          <div
            className="absolute inset-0 z-0 rounded-[46%/40%] border-[6px] border-[#6b4a2f] drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)]"
            style={{
              background:
                'radial-gradient(circle at 50% 42%, #3aa0a0 0%, #2e8c8c 55%, #1f6f6f 100%)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.35)',
            }}
          />

          {/* Decorative Table Props */}
          <TableScrollProp />
          <DrinkingHornProp />

          {/* Center of the table: trump card + the trick in progress. */}
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-4 px-6">
            {phase === 'waiting' ? (
              <MessagePanel title="Pull up a stool" subtitle="ready up to deal the cards" />
            ) : (
              <>
                {trumpCard && <TrumpIndicator card={trumpCard} revealed={phase === 'decision'} />}
                {canSwapTrump && (
                  <button
                    type="button"
                    onClick={() => setTrumpSwapMode((v) => !v)}
                    className="btn-wood btn-wood--primary !py-1 !min-h-9 !text-base z-30"
                  >
                    {trumpSwapMode ? 'Cancel — tap card' : '⇄ Swap trump'}
                  </button>
                )}
                <Trick plays={trick} trumpSuit={state.trumpSuit} />
              </>
            )}
          </div>

          {/* Opponents seated around the rim of the felt. */}
          {opponents.map((s, i) => {
            const pos = ringSlot(opponents.length, i);
            const opponentSeatNum = i + 2;
            return (
              <div
                key={s.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              >
                <Seat seat={s} phase={phase} compact seatNumber={opponentSeatNum} />
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
          isHost={isHost}
          canStart={canStart}
          meReady={meReady}
          needPlayers={seats.length < MIN_PLAYERS}
          meDecided={meDecided}
          canDecide={canDecide}
          canSwap={canSwap}
          meSwapped={meSwapped}
          isMyTurn={isMyTurn}
          selectedCount={selected.size}
          winnerNames={winnerNames}
          isWinner={isWinner}
          muted={muted}
          onReady={onReady}
          onStart={onStart}
          onStay={onStay}
          onSwap={onSwap}
          onKeep={onKeep}
          onResign={onResign}
          onRematch={onRematch}
          onToggleMute={onToggleMute}
        />
      </div>
    </div>
  );
}
