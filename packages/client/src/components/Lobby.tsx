import { useCallback, useEffect, useState } from 'react';
import { Button } from './Button';
import type { JoinIntent } from '../net/useRoom';
import { t, tAlt } from '../i18n';

const CODE_RE = /^[A-HJ-NP-Z2-9]{4}$/;
const REFRESH_MS = 5_000;

export interface LobbyRow {
  roomId: string;
  name: string | null;
  host: string | null;
  phase: string;
  playerCount: number;
  maxPlayers: number;
  spectatorCount: number;
}

async function fetchLobbies(): Promise<LobbyRow[]> {
  try {
    const res = await fetch('/api/lobbies');
    if (!res.ok) return [];
    const data = (await res.json()) as { lobbies?: LobbyRow[] };
    return data.lobbies ?? [];
  } catch {
    return [];
  }
}

function TableRow({ row, onJoin }: { row: LobbyRow; onJoin: (intent: JoinIntent) => void }) {
  const waiting = row.phase === 'waiting';
  const seatFree = waiting && row.playerCount < row.maxPlayers;
  const name = row.name || t('unnamedTable', { host: row.host ?? '?' });
  return (
    <li className="flex items-center gap-2 rounded border border-ink/15 bg-parchment-deep/40 px-3 py-1.5 font-hand">
      <span className="min-w-0 flex-1 truncate font-bold text-ink">{name}</span>
      <span className="num shrink-0 text-sm text-ink-soft">
        {row.playerCount}/{row.maxPlayers}
        {!waiting && <span className="ml-1">· {t('inGameLabel')}</span>}
      </span>
      <button
        type="button"
        onClick={() => onJoin({ mode: 'room', roomId: row.roomId })}
        className="shrink-0 rounded-lg border border-amber-deep bg-amber px-3 py-0.5 font-hand text-sm font-bold text-[#1d1503] shadow-sm disabled:opacity-40"
        disabled={waiting && !seatFree}
      >
        {seatFree ? t('joinTable') : t('watchTable')}
      </button>
    </li>
  );
}

/**
 * Web landing screen: live table browser + quick match for everyone; hosting
 * custom tables (named / private) is a premium perk, verified server-side.
 * Never shown inside Discord — there the activity instance IS the table.
 */
export function Lobby({
  onJoin,
  notice,
  canHost,
}: {
  onJoin: (intent: JoinIntent) => void;
  /** One-time message from a previous session (kicked / table closed). */
  notice?: string | null;
  /** Verified premium account (display-only; the server re-checks). */
  canHost: boolean;
}) {
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [tableName, setTableName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [code, setCode] = useState('');
  const [lobbies, setLobbies] = useState<LobbyRow[] | null>(null);
  const codeOk = CODE_RE.test(code);

  const refresh = useCallback(() => {
    void fetchLobbies().then(setLobbies);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <header className="text-center">
          <h1 className="font-display text-5xl font-bold text-cream">{t('lobbyTitle')}</h1>
          <p className="font-hand text-xl text-cream/70">{t('lobbySubtitle')}</p>
        </header>

        {notice && (
          <p className="rounded-lg border-2 border-amber-deep bg-parchment px-4 py-1.5 text-center font-hand text-lg text-danger">
            {notice}
          </p>
        )}

        <Button variant="coin" sub={tAlt('quickPlay')} onClick={() => onJoin({ mode: 'quick' })}>
          {t('quickPlay')}
        </Button>

        {/* Live table browser */}
        <div className="w-full rounded-[10px] border-2 border-gild bg-parchment px-4 py-3 [box-shadow:inset_0_0_14px_rgba(0,0,0,0.45)]">
          <div className="mb-1.5 flex items-baseline justify-between">
            <h2 className="font-hand text-lg font-bold text-ink">{t('openTables')}</h2>
            <button
              type="button"
              onClick={refresh}
              className="font-hand text-sm text-amber-deep hover:underline"
            >
              {t('refreshTables')}
            </button>
          </div>
          {!lobbies ? (
            <p className="font-hand text-ink-soft">{t('loadingEllipsis')}</p>
          ) : lobbies.length === 0 ? (
            <p className="font-hand text-ink-soft">{t('noTablesYet')}</p>
          ) : (
            <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto">
              {lobbies.map((row) => (
                <TableRow key={row.roomId} row={row} onJoin={onJoin} />
              ))}
            </ul>
          )}
        </div>

        {/* Host a table — premium perk (server re-verifies) */}
        <div
          className={`flex w-full flex-col items-center gap-2 rounded-[10px] border-2 border-gild bg-parchment px-4 py-3 [box-shadow:inset_0_0_14px_rgba(0,0,0,0.45)] ${
            canHost ? '' : 'opacity-70'
          }`}
        >
          {!canHost && (
            <p className="font-hand text-sm font-bold text-amber-deep">{t('premiumOnly')}</p>
          )}
          <input
            value={tableName}
            onChange={(e) => setTableName(e.target.value.slice(0, 24))}
            placeholder={t('tableNamePlaceholder')}
            aria-label={t('tableNamePlaceholder')}
            disabled={!canHost}
            className="w-full rounded-lg border-2 border-gild bg-parchment px-3 py-1.5 text-center font-hand text-lg text-ink outline-none focus:border-amber-deep disabled:opacity-60"
          />
          <div
            className="flex items-center gap-1.5"
            role="radiogroup"
            aria-label={t('seatsLabel', { n: '' }).trim()}
          >
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={maxPlayers === n}
                disabled={!canHost}
                onClick={() => setMaxPlayers(n)}
                className={`grid h-9 w-9 place-items-center rounded-full border font-hand text-lg font-bold disabled:opacity-60 ${
                  maxPlayers === n
                    ? 'border-amber-deep bg-amber text-[#1d1503]'
                    : 'border-ink/30 bg-parchment-deep/50 text-ink-soft'
                }`}
              >
                {n}
              </button>
            ))}
            <span className="ml-1 font-hand text-sm text-ink-soft">
              {t('seatsLabel', { n: maxPlayers })}
            </span>
          </div>
          <label className="flex items-center gap-2 font-hand text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={isPrivate}
              disabled={!canHost}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="accent-[#d98e04]"
            />
            {t('privateToggle')}
          </label>
          <Button
            variant="coin"
            secondary
            sub={tAlt('hostTable')}
            disabled={!canHost}
            onClick={() =>
              onJoin({ mode: 'create', maxPlayers, isPrivate, tableName: tableName.trim() })
            }
          >
            {t('hostTable')}
          </Button>
        </div>

        {/* Join by code */}
        <form
          className="flex w-full items-center justify-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (codeOk) onJoin({ mode: 'code', code });
          }}
        >
          <input
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z2-9]/g, '')
                  .slice(0, 4),
              )
            }
            placeholder={t('codePlaceholder')}
            aria-label={t('joinWithCode')}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="num w-28 rounded-lg border-2 border-gild bg-parchment px-3 py-2 text-center font-hand text-xl font-bold tracking-[0.3em] text-ink outline-none focus:border-amber-deep"
          />
          <Button variant="coin" secondary sub={tAlt('joinWithCode')} disabled={!codeOk}>
            {t('joinWithCode')}
          </Button>
        </form>
      </div>
    </main>
  );
}
