import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { identityFromSession } from '../auth/identity';

interface Stats {
  games_played: number;
  games_won: number;
}
interface MatchRow {
  won: boolean;
  score: number;
  opponents: string[];
  created_at: string;
}

/** Account profile: core stats (games, win %) + recent match history. */
export function Profile({ session, onClose }: { session: Session; onClose: () => void }) {
  const me = identityFromSession(session);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    (async () => {
      const [statsRes, histRes] = await Promise.all([
        supabase
          .from('player_stats')
          .select('games_played, games_won')
          .eq('user_id', me.userId)
          .maybeSingle(),
        supabase
          .from('match_results')
          .select('won, score, opponents, created_at')
          .eq('user_id', me.userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      if (!active) return;
      setStats((statsRes.data as Stats) ?? { games_played: 0, games_won: 0 });
      setHistory((histRes.data as MatchRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [me.userId]);

  const played = stats?.games_played ?? 0;
  const won = stats?.games_won ?? 0;
  const winPct = played > 0 ? Math.round((won / played) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="parchment relative flex w-full max-w-md flex-col gap-4 px-6 py-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="absolute right-3 top-2 font-hand text-2xl text-ink-soft hover:text-ink"
        >
          ✕
        </button>

        <header className="flex items-center gap-3">
          <div
            className="h-14 w-14 shrink-0 rounded-full border-2 border-amber-deep bg-parchment-deep bg-cover bg-center grid place-items-center font-hand text-2xl text-wood"
            style={me.avatarUrl ? { backgroundImage: `url("${me.avatarUrl}")` } : undefined}
          >
            {!me.avatarUrl && me.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-hand text-2xl font-bold text-ink">{me.username}</h2>
            <p className="font-hand text-sm text-ink-soft">Муушиг player</p>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Played" value={played} />
          <Stat label="Won" value={won} />
          <Stat label="Win %" value={`${winPct}%`} />
        </div>

        <div>
          <h3 className="mb-1 font-hand text-lg font-bold text-ink">Recent games</h3>
          {loading ? (
            <p className="font-hand text-ink-soft">Loading…</p>
          ) : history.length === 0 ? (
            <p className="font-hand text-ink-soft">No games yet — go deal a round.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {history.map((m, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded border border-ink/15 bg-parchment-deep/40 px-3 py-1.5 font-hand text-base"
                >
                  <span className={m.won ? 'font-bold text-success' : 'text-danger'}>
                    {m.won ? 'Win' : 'Loss'}
                  </span>
                  <span className="mx-2 min-w-0 flex-1 truncate text-center text-ink-soft">
                    vs {m.opponents.join(', ') || '—'}
                  </span>
                  <span className="num text-ink">{m.score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-ink/15 bg-parchment-deep/40 py-2">
      <div className="num font-hand text-2xl font-bold text-wood">{value}</div>
      <div className="font-hand text-xs uppercase tracking-wide text-ink-soft">{label}</div>
    </div>
  );
}
