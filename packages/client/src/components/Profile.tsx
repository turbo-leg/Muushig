import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { identityFromSession } from '../auth/identity';
import { t } from '../i18n';

interface Stats {
  games_played: number;
  games_won: number;
  rounds_played: number;
  rounds_stayed: number;
  rounds_folded: number;
  tricks_won_total: number;
  shutouts_taken: number;
  shutouts_inflicted: number;
  navshih_count: number;
  haranhui_count: number;
  perfect_rounds: number;
  current_streak: number;
  best_win_streak: number;
  rating: number;
}

const EMPTY_STATS: Stats = {
  games_played: 0,
  games_won: 0,
  rounds_played: 0,
  rounds_stayed: 0,
  rounds_folded: 0,
  tricks_won_total: 0,
  shutouts_taken: 0,
  shutouts_inflicted: 0,
  navshih_count: 0,
  haranhui_count: 0,
  perfect_rounds: 0,
  current_streak: 0,
  best_win_streak: 0,
  rating: 1000,
};

interface MatchRow {
  match_id: string;
  won: boolean;
  score: number;
  placement: number | null;
  opponents: string[];
  stats: { rating_after?: number | null } & Record<string, unknown>;
  created_at: string;
}

interface RoundRow {
  round_no: number;
  seat: string;
  stayed: boolean;
  tricks_won: number;
  shut_out: boolean;
}

/** Tiny inline rating sparkline (oldest → newest, left → right). */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const pts = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`,
    )
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-[120px]" aria-label={t('ratingHistory')}>
      <polyline points={pts} fill="none" stroke="#d98e04" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** Lazily-loaded round-by-round strip for one match. */
function MatchRounds({ matchId }: { matchId: string }) {
  const [rounds, setRounds] = useState<RoundRow[] | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase
      .from('match_rounds')
      .select('round_no, seat, stayed, tricks_won, shut_out')
      .eq('match_id', matchId)
      .order('round_no', { ascending: true })
      .then(({ data }) => {
        if (active) setRounds((data as RoundRow[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, [matchId]);

  if (!rounds) return <p className="font-hand text-sm text-ink-soft">{t('loadingEllipsis')}</p>;

  const byRound = new Map<number, RoundRow[]>();
  for (const r of rounds) {
    const list = byRound.get(r.round_no) ?? [];
    list.push(r);
    byRound.set(r.round_no, list);
  }

  return (
    <div className="flex flex-col gap-0.5 pt-1">
      {[...byRound.entries()].map(([no, rows]) => (
        <div key={no} className="flex items-baseline gap-2 font-hand text-sm leading-tight">
          <span className="w-7 shrink-0 text-ink-soft">{t('roundShort', { n: no })}</span>
          <span className="min-w-0 flex-1 truncate">
            {rows.map((r, i) => (
              <span key={i} className={r.shut_out ? 'text-danger' : 'text-ink'}>
                {i > 0 && <span className="text-ink-soft"> · </span>}
                {r.seat}{' '}
                <span className="text-ink-soft">
                  {r.stayed ? t('tricksShort', { n: r.tricks_won }) : t('foldedShort')}
                </span>
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Account profile: core + deep stats, rating sparkline, expandable history. */
export function Profile({ session, onClose }: { session: Session; onClose: () => void }) {
  const me = identityFromSession(session);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    (async () => {
      const [statsRes, histRes] = await Promise.all([
        supabase
          .from('player_stats')
          .select(
            'games_played, games_won, rounds_played, rounds_stayed, rounds_folded, tricks_won_total, shutouts_taken, shutouts_inflicted, navshih_count, haranhui_count, perfect_rounds, current_streak, best_win_streak, rating',
          )
          .eq('user_id', me.userId)
          .maybeSingle(),
        supabase
          .from('match_results')
          .select('match_id, won, score, placement, opponents, stats, created_at')
          .eq('user_id', me.userId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (!active) return;
      setStats({ ...EMPTY_STATS, ...((statsRes.data as Partial<Stats>) ?? {}) });
      setHistory((histRes.data as MatchRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [me.userId]);

  const s = stats ?? EMPTY_STATS;
  const winPct = s.games_played > 0 ? Math.round((s.games_won / s.games_played) * 100) : 0;
  const foldPct = s.rounds_played > 0 ? Math.round((s.rounds_folded / s.rounds_played) * 100) : 0;
  const avgTricks = s.rounds_stayed > 0 ? (s.tricks_won_total / s.rounds_stayed).toFixed(1) : '—';
  const streak =
    s.current_streak > 0
      ? `+${s.current_streak}`
      : s.current_streak < 0
        ? `${s.current_streak}`
        : '0';
  // Oldest → newest for the sparkline (history is newest-first).
  const ratingSeries = [...history]
    .reverse()
    .map((m) => m.stats?.rating_after)
    .filter((v): v is number => typeof v === 'number');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="parchment relative flex max-h-[90dvh] w-full max-w-md flex-col gap-4 overflow-y-auto px-6 py-6">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('closeProfile')}
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
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-hand text-2xl font-bold text-ink">{me.username}</h2>
            <p className="font-hand text-sm text-ink-soft">{t('muushigPlayer')}</p>
          </div>
          <Sparkline values={ratingSeries} />
        </header>

        <div className="grid grid-cols-5 gap-2 text-center">
          <Stat label={t('statPlayed')} value={s.games_played} />
          <Stat label={t('statWon')} value={s.games_won} />
          <Stat label={t('statWinPct')} value={`${winPct}%`} />
          <Stat label={t('statRating')} value={s.rating} />
          <Stat label={t('statStreak')} value={streak} />
        </div>

        <div>
          <h3 className="mb-1 font-hand text-lg font-bold text-ink">{t('deepStatsTitle')}</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat
              label={t('statFoldRate')}
              value={s.rounds_played > 0 ? `${foldPct}%` : '—'}
              small
            />
            <Stat label={t('statAvgTricks')} value={avgTricks} small />
            <Stat label={t('statMuushigd')} value={s.shutouts_taken} small />
            <Stat label={t('statMuushigdOthers')} value={s.shutouts_inflicted} small />
            <Stat label={t('statNavshih')} value={s.navshih_count} small />
            <Stat label={t('statHaranhui')} value={s.haranhui_count} small />
            <Stat label={t('statPerfect')} value={s.perfect_rounds} small />
            <Stat label={t('statBestStreak')} value={s.best_win_streak} small />
          </div>
        </div>

        <div>
          <h3 className="mb-1 font-hand text-lg font-bold text-ink">{t('recentGames')}</h3>
          {loading ? (
            <p className="font-hand text-ink-soft">{t('loadingEllipsis')}</p>
          ) : history.length === 0 ? (
            <p className="font-hand text-ink-soft">{t('noGamesYet')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {history.slice(0, 10).map((m) => (
                <li
                  key={m.match_id}
                  className="rounded border border-ink/15 bg-parchment-deep/40 px-3 py-1.5 font-hand text-base"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === m.match_id ? null : m.match_id)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className={m.won ? 'font-bold text-success' : 'text-danger'}>
                      {m.won ? t('winLabel') : t('lossLabel')}
                    </span>
                    <span className="mx-2 min-w-0 flex-1 truncate text-center text-ink-soft">
                      {t('vsLabel', { names: m.opponents.join(', ') || '—' })}
                    </span>
                    {m.placement != null && (
                      <span className="mr-2 text-ink-soft">
                        {t('placementLabel', { n: m.placement })}
                      </span>
                    )}
                    <span className="num text-ink">{m.score}</span>
                  </button>
                  {expanded === m.match_id && <MatchRounds matchId={m.match_id} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-ink/15 bg-parchment-deep/40 py-2">
      <div className={`num font-hand font-bold text-wood ${small ? 'text-lg' : 'text-2xl'}`}>
        {value}
      </div>
      <div className="font-hand text-xs uppercase tracking-wide text-ink-soft leading-tight">
        {label}
      </div>
    </div>
  );
}
