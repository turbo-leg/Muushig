import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@muushig/shared';
import type { CardVM, SeatVM, TrickPlayVM, Phase } from '../game/types';
import { cardKey, legalMoves } from '../game/legalMoves';
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

export function Table({ state, sessionId, send }: Props) {
  const phase = state.phase as Phase;

  // ── Derive plain view-models from the synced schema ──
  const seats: SeatVM[] = [];
  state.seatOrder.forEach((id) => {
    const p = state.players.get(id);
    seats.push({
      id,
      username: p?.username ?? 'Player',
      avatarUrl: p?.avatarUrl ?? '',
      score: p?.score ?? 15,
      tricksWon: p?.tricksWon ?? 0,
      handCount: p?.hand.length ?? 0,
      isReady: p?.isReady ?? false,
      isHost: id === state.hostId,
      isTurn: phase === 'playing' && state.currentTurn === id,
      hasDecided: p?.hasDecided ?? false,
      hasResigned: p?.hasResigned ?? false,
      isMe: id === sessionId,
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
  const canSwap = phase === 'swap' && !!meRaw && !meRaw.hasSwapped && !meRaw.hasResigned;
  const isMyTurn = phase === 'playing' && state.currentTurn === sessionId;

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

  const onToggleSelect = useCallback((c: CardVM) => {
    const key = cardKey(c);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < 5) next.add(key);
      return next;
    });
    playSfx('click');
  }, []);

  // ── Actions (each ensures audio is unlocked on the gesture) ──
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

  const opponents = seats.filter((s) => !s.isMe);

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-4xl flex-col gap-4 p-3">
      <TitleBanner />

      <div className="flex flex-wrap items-start justify-center gap-2">
        {opponents.map((s) => (
          <Seat key={s.id} seat={s} phase={phase} />
        ))}
      </div>

      <div className="wood-surface relative flex flex-1 flex-col items-center justify-center gap-5 rounded-[28px] border-4 border-wood-dark p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_0_40px_rgba(0,0,0,0.35)]">
        {phase === 'waiting' ? (
          <div className="parchment flex max-w-xs -rotate-2 flex-col items-center gap-1 px-8 py-5 text-center">
            <p className="font-hand text-3xl leading-tight text-ink">Pull up a stool</p>
            <p className="font-hand text-xl text-ink-soft">ready up to deal the cards</p>
          </div>
        ) : (
          <>
            {trumpCard && <TrumpIndicator card={trumpCard} revealed={phase === 'decision'} />}
            <Trick plays={trick} trumpSuit={state.trumpSuit} />
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        {me && <Seat seat={me} phase={phase} />}
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
        />
        <ActionBar
          phase={phase}
          isHost={isHost}
          canStart={canStart}
          meReady={meReady}
          needPlayers={seats.length < MIN_PLAYERS}
          meDecided={meDecided}
          canSwap={canSwap}
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
