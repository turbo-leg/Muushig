import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room } from 'colyseus.js';
import type { GameState } from '@muushig/shared';
import { createClient } from './client';
import { resolveIdentity } from '../discord';
import { useAuth } from '../auth/AuthContext';
import { identityFromSession } from '../auth/identity';

export type ConnStatus = 'connecting' | 'connected' | 'error';

export interface RoomConnection {
  status: ConnStatus;
  error: string | null;
  state: GameState | null;
  sessionId: string | null;
  send: (type: string, payload?: unknown) => void;
}

/**
 * Joins (or creates) a Muushig room and keeps React in sync with the synced
 * GameState. The schema mutates in place, so we bump a version counter on every
 * patch to trigger re-renders while returning the live state object.
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
    let joined: Room<GameState> | null = null;

    (async () => {
      try {
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
        const client = createClient();
        const room = await client.joinOrCreate<GameState>(roomName, {
          username: id.username,
          avatarUrl: id.avatarUrl,
          discordId: id.discordId,
          discordInstanceId: id.discordInstanceId,
          accessToken: id.accessToken,
        });

        if (cancelled) {
          void room.leave();
          return;
        }

        joined = room;
        roomRef.current = room;
        stateRef.current = room.state;
        setStatus('connected');
        rerender();

        room.onStateChange(() => {
          stateRef.current = room.state;
          rerender();
        });
        room.onError((code, message) => {
          setError(message ?? `Connection error (${code})`);
          setStatus('error');
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to connect');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      void joined?.leave();
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
