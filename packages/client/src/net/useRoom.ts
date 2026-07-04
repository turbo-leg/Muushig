import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room } from 'colyseus.js';
import type { GameState } from '@muushig/shared';
import { createClient } from './client';
import { resolveIdentity } from '../discord';
import { useAuth } from '../auth/AuthContext';
import { identityFromSession } from '../auth/identity';

export type ConnStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  /** Removed by the host — terminal; do not rejoin. */
  | 'kicked'
  /** Left the table / table gone — terminal; back to the lobby. */
  | 'closed';

/** How the player wants to reach a table. */
export type JoinIntent =
  | { mode: 'quick' }
  | { mode: 'create'; maxPlayers: number; isPrivate: boolean; tableName?: string }
  | { mode: 'code'; code: string }
  | { mode: 'room'; roomId: string };

export interface RoomConnection {
  status: ConnStatus;
  error: string | null;
  state: GameState | null;
  sessionId: string | null;
  send: (type: string, payload?: unknown) => void;
}

/** Colyseus close code for a consented/normal leave. Anything else is a drop. */
const CONSENTED_LEAVE_CODE = 1000;
/** Server-initiated terminal closes (e.g. kick = 4001) — never auto-rejoin. */
const TERMINAL_CODE_MIN = 4000;
const REJOIN_ATTEMPTS = 5;
const REJOIN_BASE_DELAY_MS = 500;

const tokenKey = (roomName: string) => `muushig:reconnect:${roomName}`;
const INTENT_KEY = 'muushig:intent';

function readToken(roomName: string): string | null {
  try {
    return sessionStorage.getItem(tokenKey(roomName));
  } catch {
    return null;
  }
}

function writeToken(roomName: string, token: string | null): void {
  try {
    if (token) sessionStorage.setItem(tokenKey(roomName), token);
    else sessionStorage.removeItem(tokenKey(roomName));
  } catch {
    /* storage unavailable (some embedded contexts) — reconnection degrades gracefully */
  }
}

/** The intent survives iframe reloads next to the reconnect token. */
export function readStoredIntent(): JoinIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JoinIntent;
    if (parsed.mode === 'quick') return parsed;
    if (parsed.mode === 'create' && typeof parsed.maxPlayers === 'number') {
      // Older stored intents predate isPrivate; they meant a code table.
      return { ...parsed, isPrivate: parsed.isPrivate ?? true };
    }
    if (parsed.mode === 'code' && typeof parsed.code === 'string') return parsed;
    if (parsed.mode === 'room' && typeof parsed.roomId === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function writeStoredIntent(intent: JoinIntent | null): void {
  try {
    if (intent) sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
    else sessionStorage.removeItem(INTENT_KEY);
  } catch {
    /* ignore */
  }
}

/** Resolves a join code to a roomId via the server (null = gone/unknown). */
async function resolveCode(code: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/table/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { roomId?: string };
    return data.roomId ?? null;
  } catch {
    return null;
  }
}

/** First public table with a free seat (quick-play matchmaking). */
async function findOpenTable(): Promise<string | null> {
  try {
    const res = await fetch('/api/lobbies');
    if (!res.ok) return null;
    const data = (await res.json()) as {
      lobbies?: Array<{ roomId: string; phase: string; playerCount: number; maxPlayers: number }>;
    };
    const open = (data.lobbies ?? []).find(
      (l) => l.phase === 'waiting' && l.playerCount < l.maxPlayers,
    );
    return open?.roomId ?? null;
  } catch {
    return null;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Joins (or creates) a Muushig room per the given intent and keeps React in
 * sync with the synced GameState. The schema mutates in place, so we bump a
 * version counter on every patch to trigger re-renders.
 *
 * Reconnection: the server holds a mid-game seat for a window after a drop.
 * We persist the room's reconnection token in sessionStorage so an iframe
 * reload rejoins the same seat, and retry with backoff on abnormal closes.
 * Codes ≥4000 (kick) and consented closes are terminal — no rejoin.
 */
export function useRoom(intent: JoinIntent, roomName = 'muushig'): RoomConnection {
  const { session } = useAuth();
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [, setVersion] = useState(0);
  const roomRef = useRef<Room<GameState> | null>(null);
  const stateRef = useRef<GameState | null>(null);

  const rerender = useCallback(() => setVersion((v) => v + 1), []);
  const userId = session?.user.id;
  const intentJson = JSON.stringify(intent);

  useEffect(() => {
    let cancelled = false;
    const client = createClient();
    // A created table converts to a code intent once the code is known, so a
    // reload (or rejoin fallback) never creates a second empty table.
    let liveIntent: JoinIntent = JSON.parse(intentJson) as JoinIntent;
    writeStoredIntent(liveIntent);

    const wire = (room: Room<GameState>) => {
      roomRef.current = room;
      stateRef.current = room.state;
      writeToken(roomName, room.reconnectionToken);
      setStatus('connected');
      setError(null);
      rerender();

      // A created PUBLIC table converts to a room intent right away; a private
      // one converts to its code once it syncs (below). Either way a reload or
      // rejoin fallback never creates a second empty table.
      if (liveIntent.mode === 'create' && !liveIntent.isPrivate) {
        liveIntent = { mode: 'room', roomId: room.roomId };
        writeStoredIntent(liveIntent);
      }

      room.onStateChange(() => {
        stateRef.current = room.state;
        if (liveIntent.mode === 'create' && room.state.joinCode) {
          liveIntent = { mode: 'code', code: room.state.joinCode };
          writeStoredIntent(liveIntent);
        }
        rerender();
      });
      room.onError((code, message) => {
        setError(message ?? `Connection error (${code})`);
        setStatus('error');
      });
      room.onLeave((code) => {
        roomRef.current = null;
        if (cancelled) return;
        if (code >= TERMINAL_CODE_MIN) {
          writeToken(roomName, null);
          writeStoredIntent(null);
          setStatus('kicked');
          return;
        }
        if (code === CONSENTED_LEAVE_CODE) {
          writeToken(roomName, null);
          writeStoredIntent(null);
          setStatus('closed');
          return;
        }
        void rejoin();
      });
    };

    /** After an abnormal drop: retry the held seat with backoff. */
    const rejoin = async () => {
      setStatus('reconnecting');
      for (let attempt = 0; attempt < REJOIN_ATTEMPTS && !cancelled; attempt++) {
        const token = readToken(roomName);
        if (!token) break;
        try {
          const room = await client.reconnect<GameState>(token);
          if (cancelled) {
            void room.leave();
            return;
          }
          wire(room);
          return;
        } catch {
          await delay(REJOIN_BASE_DELAY_MS * 2 ** attempt);
        }
      }
      if (cancelled) return;
      // Seat unrecoverable (window expired / room gone) — try the intent from
      // scratch; a dead code table surfaces 'closed' instead of a stray join.
      try {
        const room = await freshJoin();
        if (room) wire(room);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Connection lost');
        setStatus('error');
      }
    };

    /** Joins per the live intent. Returns null when the intent is terminal. */
    const freshJoin = async (): Promise<Room<GameState> | null> => {
      // Prefer the signed-in account; otherwise fall back to Discord/guest.
      const acct = session ? identityFromSession(session) : null;
      const id = acct
        ? {
            username: acct.username,
            avatarUrl: acct.avatarUrl,
            discordId: '',
            discordInstanceId: 'web',
            accessToken: acct.accessToken,
          }
        : await resolveIdentity();
      const identityOptions = {
        username: id.username,
        avatarUrl: id.avatarUrl,
        discordId: id.discordId,
        discordInstanceId: id.discordInstanceId,
        accessToken: id.accessToken,
      };

      const surfaceClosed = () => {
        if (!cancelled) {
          writeToken(roomName, null);
          writeStoredIntent(null);
          setStatus('closed');
        }
      };

      if (liveIntent.mode === 'create') {
        // Hosting is premium — the server verifies the token and rejects
        // otherwise; the Lobby UI only offers this to premium accounts.
        return client.create<GameState>(roomName, {
          ...identityOptions,
          customTable: true,
          privateTable: liveIntent.isPrivate,
          tableName: liveIntent.tableName ?? '',
          maxPlayers: liveIntent.maxPlayers,
        });
      }
      if (liveIntent.mode === 'code') {
        const roomId = await resolveCode(liveIntent.code);
        if (!roomId) {
          surfaceClosed();
          return null;
        }
        return client.joinById<GameState>(roomId, identityOptions);
      }
      if (liveIntent.mode === 'room') {
        try {
          return await client.joinById<GameState>(liveIntent.roomId, identityOptions);
        } catch {
          surfaceClosed(); // table filled or vanished between listing and join
          return null;
        }
      }

      // Quick play. Inside Discord the activity instance is the table —
      // keep the instance-filtered joinOrCreate. On the web, matchmake
      // through the lobby list so full tables never dead-end a player.
      if (
        id.discordInstanceId &&
        id.discordInstanceId !== 'web' &&
        id.discordInstanceId !== 'local-dev'
      ) {
        return client.joinOrCreate<GameState>(roomName, identityOptions);
      }
      for (let attempt = 0; attempt < 2; attempt++) {
        const roomId = await findOpenTable();
        if (!roomId) break;
        try {
          return await client.joinById<GameState>(roomId, identityOptions);
        } catch {
          /* seat filled in the race — refetch and try again */
        }
      }
      // No open table — start a plain one (free; not a premium custom table).
      return client.create<GameState>(roomName, identityOptions);
    };

    (async () => {
      try {
        // An iframe reload lands here with a token from the previous page
        // life: reclaim the held seat before falling back to a fresh join.
        const token = readToken(roomName);
        let room: Room<GameState> | null = null;
        if (token) {
          try {
            room = await client.reconnect<GameState>(token);
          } catch {
            writeToken(roomName, null);
          }
        }
        room ??= await freshJoin();
        if (!room) return; // terminal intent (e.g. dead code) — status already set

        if (cancelled) {
          void room.leave();
          return;
        }
        wire(room);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to connect');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      void roomRef.current?.leave();
      roomRef.current = null;
    };
    // Reconnect on login/logout (stable userId) or intent change, not on token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, rerender, userId, intentJson]);

  const send = useCallback((type: string, payload?: unknown) => {
    roomRef.current?.send(type, payload as never);
  }, []);

  return {
    status,
    error,
    state: stateRef.current,
    sessionId: roomRef.current?.sessionId ?? null,
    send,
  };
}
