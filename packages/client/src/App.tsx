import { Background } from './components/Background';
import { Lobby, type LobbyPlayer } from './components/Lobby';
import { useRoom } from './net/useRoom';
import type { GameState } from '@muushig/shared';

function derivePlayers(state: GameState): LobbyPlayer[] {
  return Array.from(state.seatOrder)
    .filter((id): id is string => typeof id === 'string')
    .map((id) => {
      const p = state.players.get(id);
      return { id, username: p?.username ?? 'Player', isReady: p?.isReady ?? false };
    });
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <div className="w-full">{children}</div>
    </main>
  );
}

export default function App() {
  const { status, error, state, sessionId, send } = useRoom();

  return (
    <>
      <Background />
      {status === 'connecting' && (
        <Centered>
          <p className="text-center font-body text-starlight-muted">Connecting to the steppe…</p>
        </Centered>
      )}

      {status === 'error' && (
        <Centered>
          <p className="text-center font-body text-danger">{error ?? 'Connection failed'}</p>
        </Centered>
      )}

      {status === 'connected' && state && (
        <Centered>
          {state.phase === 'waiting' ? (
            <Lobby
              players={derivePlayers(state)}
              hostId={state.hostId}
              sessionId={sessionId}
              maxPlayers={state.maxPlayers}
              onReady={() => send('ready')}
              onStart={() => send('start')}
            />
          ) : (
            <p className="text-center font-display text-h2 text-starlight">
              Round in progress — table UI coming soon
            </p>
          )}
        </Centered>
      )}
    </>
  );
}
