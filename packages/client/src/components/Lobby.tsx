import { Button } from './Button';

export interface LobbyPlayer {
  id: string;
  username: string;
  isReady: boolean;
}

export interface LobbyProps {
  players: LobbyPlayer[];
  hostId: string;
  sessionId: string | null;
  maxPlayers: number;
  minPlayers?: number;
  onReady: () => void;
  onStart: () => void;
}

/**
 * Pre-game lobby (phase: waiting). Pure/presentational so it can be tested
 * without a live room — the container derives these props from GameState.
 */
export function Lobby({
  players,
  hostId,
  sessionId,
  maxPlayers,
  minPlayers = 2,
  onReady,
  onStart,
}: LobbyProps) {
  const me = players.find((p) => p.id === sessionId) ?? null;
  const isHost = sessionId !== null && sessionId === hostId;
  const allReady = players.length > 0 && players.every((p) => p.isReady);
  const canStart = isHost && players.length >= minPlayers && allReady;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center gap-8">
      <header className="text-center">
        <h1 className="font-display text-h1 tracking-wide text-starlight">Муушиг</h1>
        <p className="font-body text-small uppercase tracking-[0.2em] text-starlight-muted">
          Eternal Blue Sky
        </p>
      </header>

      <div className="w-full rounded-lg border border-starlight-faint/40 bg-void p-5 shadow-panel">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-h3 text-starlight">Players</h2>
          <span className="num font-body text-small text-starlight-muted">
            {players.length}/{maxPlayers}
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-md bg-void-raised px-3 py-2"
            >
              <span className="flex items-center gap-2 font-body text-starlight">
                {p.username}
                {p.id === hostId && (
                  <span className="rounded bg-gold/15 px-1.5 py-0.5 text-small font-semibold text-gold">
                    Host
                  </span>
                )}
                {p.id === sessionId && (
                  <span className="text-small text-starlight-muted">(you)</span>
                )}
              </span>
              <span
                className={`text-small font-semibold ${
                  p.isReady ? 'text-success' : 'text-starlight-faint'
                }`}
              >
                {p.isReady ? 'Ready' : 'Waiting'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button variant="secondary" onClick={onReady}>
          {me?.isReady ? 'Not ready' : 'Ready up'}
        </Button>
        {isHost && (
          <Button onClick={onStart} disabled={!canStart}>
            {canStart
              ? 'Start game'
              : players.length < minPlayers
                ? `Need ${minPlayers}+ players`
                : 'Waiting for all ready'}
          </Button>
        )}
        {!isHost && (
          <p className="text-center font-body text-small text-starlight-muted">
            Waiting for the host to start…
          </p>
        )}
      </div>
    </section>
  );
}
