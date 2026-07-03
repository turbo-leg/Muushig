import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room } from 'colyseus.js';
import type { GameState } from '@muushig/shared';
import { createClient } from './client';
import { resolveIdentity } from '../discord';
import { useAuth } from '../auth/AuthContext';
import { identityFromSession } from '../auth/identity';

export type ConnStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface RoomConnection {
  status: ConnStatus;
  error: string | null;
  state: GameState | null;
  sessionId: string | null;
  send: (type: string, payload?: unknown) => void;
}

/** Colyseus close code for a consented/normal leave. Anything else is a drop. */
const CONSENTED_LEAVE_CODE = 1000;
const REJOIN_ATTEMPTS = 5;
const REJOIN_BASE_DELAY_MS = 500;

const tokenKey = (roomName: string) => `muushig:reconnect:${roomName}`;

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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Joins (or creates) a Muushig room and keeps React in sync with the synced
 * GameState. The schema mutates in place, so we bump a version counter on every
 * patch to trigger re-renders while returning the live state object.
 *
 * Reconnection: the server holds a mid-game seat for a window after a drop.
 * We persist the room's reconnection token in sessionStorage so an iframe
 * reload rejoins the same seat, and retry with backoff on abnormal closes.
 */
export function useRoom(roomName = 'muushig'): RoomConnection {
  const { session } = useAuth();
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [, setVersion] = useState(0);
  const roomRef = useRef<Room<GameState> | null>(null);
  const stateRef = useRef<GameState | null>(null);

  const rerender = useCallback(() => setVersion((v) => v + 1), []);
  const userId = session?.user.id;

  useEffect(() => {
    let cancelled = false;
    const client = createClient();

    const wire = (room: Room<GameState>) => {
      roomRef.current = room;
      stateRef.current = room.state;
      writeToken(roomName, room.reconnectionToken);
      setStatus('connected');
      setError(null);
      rerender();

      room.onStateChange(() => {
        stateRef.current = room.state;
        rerender();
      });
      room.onError((code, message) => {
        setError(message ?? `Connection error (${code})`);
        setStatus('error');
      });
      room.onLeave((code) => {
        roomRef.current = null;
        if (cancelled) return;
        if (code === CONSENTED_LEAVE_CODE) {
          writeToken(roomName, null);
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
      // Seat unrecoverable (window expired / room gone) — try a fresh join so
      // at least the lobby works; mid-game rooms reject new joins.
      try {
        wire(await freshJoin());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Connection lost');
        setStatus('error');
      }
    };

    const freshJoin = async (): Promise<Room<GameState>> => {
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
      return client.joinOrCreate<GameState>(roomName, {
        username: id.username,
        avatarUrl: id.avatarUrl,
        discordId: id.discordId,
        discordInstanceId: id.discordInstanceId,
        accessToken: id.accessToken,
      });
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
    // Reconnect on login/logout (stable userId), not on token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, rerender, userId]);

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
