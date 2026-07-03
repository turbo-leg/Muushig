import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { t } from '../i18n';

interface LeaderboardRow {
  username: string;
  avatar_url: string | null;
  rating: number;
  games_played: number;
  games_won: number;
  best_win_streak: number;
}

/**
 * Top players by rating, read from the world-readable `leaderboard` view —
 * guests can browse it too (the anon key covers SELECT).
 */
export function Leaderboard({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase
      .from('leaderboard')
      .select('username, avatar_url, rating, games_played, games_won, best_win_streak')
      .limit(20)
      .then(({ data }) => {
        if (active) setRows((data as LeaderboardRow[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('leaderboardTitle')}
    >
      <div
        className="parchment relative flex max-h-[85dvh] w-full max-w-md flex-col gap-3 overflow-y-auto px-6 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('closeProfile')}
          className="absolute right-3 top-2 font-hand text-2xl text-ink-soft hover:text-ink"
        >
          ✕
        </button>
        <h2 className="font-hand text-2xl font-bold text-ink">🏆 {t('leaderboardTitle')}</h2>

        {!rows ? (
          <p className="font-hand text-ink-soft">{t('loadingEllipsis')}</p>
        ) : rows.length === 0 ? (
          <p className="font-hand text-ink-soft">{t('leaderboardEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((r, i) => (
              <li
                key={`${r.username}-${i}`}
                className="flex items-center gap-2 rounded border border-ink/15 bg-parchment-deep/40 px-3 py-1.5 font-hand"
              >
                <span className="num w-6 shrink-0 text-right font-bold text-wood">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-ink">{r.username}</span>
                <span className="shrink-0 text-sm text-ink-soft">
                  {r.games_won}/{r.games_played} {t('colGames').toLowerCase()}
                </span>
                <span className="num w-12 shrink-0 text-right text-lg font-bold text-amber-deep">
                  {r.rating}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
