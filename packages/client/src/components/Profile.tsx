import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { identityFromSession } from '../auth/identity';
import { t } from '../i18n';
import { GoldCoinIcon } from './Icons';

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

interface LeaderboardRow {
  username: string;
  avatar_url: string | null;
  rating: number;
  games_played: number;
  games_won: number;
  best_win_streak: number;
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
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-7 w-[120px] filter drop-shadow-sm"
      aria-label={t('ratingHistory')}
    >
      <polyline
        points={pts}
        fill="none"
        stroke="#d98e04"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
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

  if (!rounds) return <p className="font-hand text-sm text-[#c5bbae]">{t('loadingEllipsis')}</p>;

  const byRound = new Map<number, RoundRow[]>();
  for (const r of rounds) {
    const list = byRound.get(r.round_no) ?? [];
    list.push(r);
    byRound.set(r.round_no, list);
  }

  return (
    <div className="flex flex-col gap-1.5 pt-2 border-t border-gild/10 mt-2">
      {[...byRound.entries()].map(([no, rows]) => (
        <div key={no} className="flex items-baseline gap-2 font-hand text-sm leading-tight">
          <span className="w-8 shrink-0 text-[#c5bbae] font-semibold">
            {t('roundShort', { n: no })}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {rows.map((r, i) => (
              <span
                key={i}
                className={r.shut_out ? 'text-danger font-bold animate-pulse' : 'text-cream'}
              >
                {i > 0 && <span className="text-[#c5bbae]"> · </span>}
                {r.seat}{' '}
                <span className="text-[#c5bbae]">
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

export function Profile({
  session,
  signOut,
  onClose,
}: {
  session: Session;
  signOut?: () => Promise<void>;
  onClose?: () => void;
}) {
  const me = identityFromSession(session);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<MatchRow[]>([]);
  const [coins, setCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Relocated leaderboard states
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'leaderboard'>('stats');
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[] | null>(null);
  const [mobileLeaders, setMobileLeaders] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const [statsRes, histRes, profileRes, leadersRes] = await Promise.all([
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
          supabase.from('profiles').select('coins').eq('id', me.userId).maybeSingle(),
          // Pre-fetch top 5 for mobile card
          supabase
            .from('leaderboard')
            .select('username, avatar_url, rating, games_played, games_won, best_win_streak')
            .limit(5),
        ]);
        if (!active) return;
        setStats({ ...EMPTY_STATS, ...((statsRes.data as Partial<Stats>) ?? {}) });
        setHistory((histRes.data as MatchRow[]) ?? []);
        setMobileLeaders((leadersRes.data as LeaderboardRow[]) ?? []);

        if (profileRes.data) {
          const pData = profileRes.data as { coins?: number };
          setCoins(pData.coins ?? 0);
        }
      } catch {
        // Fallback silently
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [me.userId]);

  // Lazy-load full leaderboard for desktop sub-tab
  useEffect(() => {
    if (activeSubTab !== 'leaderboard' || !supabase) return;
    let active = true;
    void supabase
      .from('leaderboard')
      .select('username, avatar_url, rating, games_played, games_won, best_win_streak')
      .limit(20)
      .then(({ data }) => {
        if (active) setLeaderboardRows((data as LeaderboardRow[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, [activeSubTab]);

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

  const ratingSeries = [...history]
    .reverse()
    .map((m) => m.stats?.rating_after)
    .filter((v): v is number => typeof v === 'number');

  const innerContent = (
    <div className="w-full flex flex-col gap-6 p-1 sm:p-4 text-[#332b25]">
      {/* Profile Header Card */}
      <div className="bg-[#fdfbf7] border-2 border-gild/20 rounded-[24px] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 shrink-0 rounded-full border-2 border-amber bg-parchment-deep bg-cover bg-center grid place-items-center font-hand text-3xl font-extrabold text-ember shadow-sm"
            style={me.avatarUrl ? { backgroundImage: `url("${me.avatarUrl}")` } : undefined}
          >
            {!me.avatarUrl && me.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-extrabold text-ember tracking-wide leading-tight">
              {me.username}
            </h2>
            <div className="flex items-center gap-2 font-hand text-sm text-[#c5bbae] mt-1 font-semibold">
              <span>{t('muushigPlayer')}</span>
              {coins !== null && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber">
                    <GoldCoinIcon className="w-3.5 h-3.5" />
                    <span>{coins}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-gild/10 sm:border-t-0 pt-4 sm:pt-0">
          <div className="text-right hidden sm:block">
            <span className="font-hand text-xs text-[#c5bbae] block uppercase tracking-wider font-semibold">
              Rating History
            </span>
          </div>
          <Sparkline values={ratingSeries} />
        </div>
      </div>

      {/* Desktop Sub-navigation Tabs */}
      <div className="hidden lg:flex items-center gap-6 border-b border-gild/20 pb-1 select-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('stats')}
          className={`font-hand text-lg font-bold pb-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'stats'
              ? 'border-amber text-amber'
              : 'border-transparent text-[#5c4a3b] hover:text-amber'
          }`}
        >
          {t('tabStats', { defaultValue: 'My Stats' })}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('leaderboard')}
          className={`font-hand text-lg font-bold pb-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'leaderboard'
              ? 'border-amber text-amber'
              : 'border-transparent text-[#5c4a3b] hover:text-amber'
          }`}
        >
          {t('leaderboardTitle', { defaultValue: 'Leaderboard' })}
        </button>
      </div>

      {/* Main Tab Render Area */}
      <div>
        {activeSubTab === 'stats' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Stats Section */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Main stats block */}
              <div className="bg-parchment-deep/80 backdrop-blur-sm border border-gild/30 rounded-[20px] p-5 shadow-sm">
                <h3 className="font-display text-base font-bold text-ember border-b border-gild/15 pb-2 mb-4 select-none">
                  {t('tabStats', { defaultValue: 'General Stats' })}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center select-none">
                  <Stat label={t('statPlayed')} value={s.games_played} />
                  <Stat label={t('statWon')} value={s.games_won} />
                  <Stat label={t('statWinPct')} value={`${winPct}%`} />
                  <Stat label={t('statRating')} value={s.rating} />
                  <Stat label={t('statStreak')} value={streak} />
                </div>
              </div>

              {/* Deep stats block */}
              <div className="bg-parchment-deep/80 backdrop-blur-sm border border-gild/30 rounded-[20px] p-5 shadow-sm">
                <h3 className="font-display text-base font-bold text-ember border-b border-gild/15 pb-2 mb-4 select-none">
                  {t('deepStatsTitle')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center select-none">
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
            </div>

            {/* Right Match History Section */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-parchment-deep/80 backdrop-blur-sm border border-gild/30 rounded-[20px] p-5 shadow-sm flex flex-col h-full">
                <h3 className="font-display text-base font-bold text-ember border-b border-gild/15 pb-2 mb-4 select-none">
                  {t('recentGames')}
                </h3>

                <div className="flex-1 overflow-y-auto max-h-[360px] pr-1">
                  {loading ? (
                    <p className="font-hand text-[#c5bbae]">{t('loadingEllipsis')}</p>
                  ) : history.length === 0 ? (
                    <p className="font-hand text-[#c5bbae]">{t('noGamesYet')}</p>
                  ) : (
                    <ul className="flex flex-col gap-2.5">
                      {history.slice(0, 10).map((m) => (
                        <li
                          key={m.match_id}
                          className="rounded-xl border border-gild/15 bg-[#4c1116]/20 hover:bg-[#4c1116]/40 p-3.5 font-hand text-base transition-all duration-200"
                        >
                          <button
                            type="button"
                            onClick={() => setExpanded(expanded === m.match_id ? null : m.match_id)}
                            className="flex w-full items-center justify-between text-left cursor-pointer"
                          >
                            <span
                              className={
                                m.won
                                  ? 'font-extrabold text-success text-base'
                                  : 'font-bold text-danger text-base'
                              }
                            >
                              {m.won ? t('winLabel') : t('lossLabel')}
                            </span>
                            <span className="mx-3 min-w-0 flex-1 truncate text-center text-[#c5bbae] font-semibold text-sm">
                              {t('vsLabel', { names: m.opponents.join(', ') || '—' })}
                            </span>
                            {m.placement != null && (
                              <span className="mr-3 text-[#c5bbae] font-bold text-xs bg-gild/10 px-2 py-0.5 rounded-md">
                                {t('placementLabel', { n: m.placement })}
                              </span>
                            )}
                            <span className="num font-bold text-ember">{m.score}</span>
                          </button>
                          {expanded === m.match_id && <MatchRounds matchId={m.match_id} />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Mobile-only Top Players Card (Appears under history on mobile views) */}
              <div className="block lg:hidden bg-parchment-deep/80 backdrop-blur-sm border border-gild/30 rounded-[20px] p-5 shadow-sm">
                <h3 className="font-display text-base font-bold text-ember border-b border-gild/15 pb-2 mb-4 select-none">
                  {t('leaderboardTitle', { defaultValue: 'Top Players' })}
                </h3>
                {!mobileLeaders ? (
                  <p className="font-hand text-[#c5bbae]">{t('loadingEllipsis')}</p>
                ) : mobileLeaders.length === 0 ? (
                  <p className="font-hand text-[#c5bbae]">{t('leaderboardEmpty')}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {mobileLeaders.map((r, i) => (
                      <li
                        key={`${r.username}-${i}`}
                        className="flex items-center gap-3 rounded-xl border border-gild/15 bg-[#4c1116]/10 px-3 py-2 font-hand text-sm"
                      >
                        <span className="num w-5 shrink-0 text-right font-extrabold text-ember">{i + 1}</span>
                        <div
                          className="h-6 w-6 rounded-full border border-amber/40 bg-parchment bg-cover bg-center shrink-0"
                          style={r.avatar_url ? { backgroundImage: `url("${r.avatar_url}")` } : undefined}
                        />
                        <span className="min-w-0 flex-1 truncate font-bold text-[#332b25]">{r.username}</span>
                        <span className="num w-12 shrink-0 text-right font-extrabold text-amber-deep">
                          {r.rating}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Leaderboard sub-tab */
          <div className="bg-parchment-deep/80 backdrop-blur-sm border border-gild/30 rounded-[20px] p-5 shadow-sm">
            <h3 className="font-display text-base font-bold text-ember border-b border-gild/15 pb-2 mb-4 select-none">
              {t('leaderboardTitle', { defaultValue: 'Leaderboard' })}
            </h3>
            {!leaderboardRows ? (
              <p className="font-hand text-[#c5bbae]">{t('loadingEllipsis')}</p>
            ) : leaderboardRows.length === 0 ? (
              <p className="font-hand text-[#c5bbae]">{t('leaderboardEmpty')}</p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                {leaderboardRows.map((r, i) => (
                  <li
                    key={`${r.username}-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-gild/15 bg-[#4c1116]/10 px-4 py-2.5 font-hand text-base"
                  >
                    <span className="num w-6 shrink-0 text-right font-extrabold text-ember">{i + 1}</span>
                    <div
                      className="h-7 w-7 rounded-full border border-amber/40 bg-parchment bg-cover bg-center shrink-0"
                      style={r.avatar_url ? { backgroundImage: `url("${r.avatar_url}")` } : undefined}
                    />
                    <span className="min-w-0 flex-1 truncate font-bold text-[#332b25]">{r.username}</span>
                    <span className="shrink-0 text-sm text-[#c5bbae] font-semibold">
                      {r.games_won}/{r.games_played} {t('colGames', { defaultValue: 'games' }).toLowerCase()}
                    </span>
                    <span className="num w-16 shrink-0 text-right text-lg font-extrabold text-amber-deep">
                      {r.rating}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Sign Out option */}
      {signOut && (
        <div className="flex justify-end mt-4 select-none">
          <button
            type="button"
            onClick={signOut}
            className="w-full sm:w-auto sm:px-8 cursor-pointer rounded-xl border-2 border-danger/45 bg-[#4c1116] hover:bg-[#350e13] py-3 font-hand text-sm font-bold text-cream transition-all duration-300 active:scale-95 shadow-sm"
          >
            {t('signOut')}
          </button>
        </div>
      )}
    </div>
  );

  if (onClose) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 safe-pad"
        onClick={onClose}
      >
        <div
          className="parchment relative flex max-h-[90dvh] w-full max-w-2xl flex-col gap-4 overflow-y-auto px-6 py-6 border-2 border-gild/45 rounded-[24px] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3 font-hand text-2xl text-ink-soft hover:text-ink cursor-pointer"
          >
            ✕
          </button>
          {innerContent}
        </div>
      </div>
    );
  }

  return innerContent;
}

function Stat({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-gild/15 bg-[#4c1116]/40 py-2.5 shadow-sm">
      <div className={`num font-hand font-extrabold text-ember ${small ? 'text-lg' : 'text-2xl'}`}>
        {value}
      </div>
      <div className="font-hand text-[10px] uppercase tracking-wider text-[#c5bbae] leading-tight mt-1 font-bold">
        {label}
      </div>
    </div>
  );
}
