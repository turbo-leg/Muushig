import { useEffect } from 'react';
import type { SeatVM } from '../game/types';
import { t } from '../i18n';

interface Props {
  seats: SeatVM[];
  onClose: () => void;
}

/**
 * Full-screen scoresheet — a paper score pad. One column per player, one row per
 * completed round: the running total, or "-" for a round that player folded.
 * Everyone starts at 15 and counts down to 0.
 */
export function ScoreSheet({ seats, onClose }: Props) {
  // Close on Escape for keyboard / desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rounds = seats.reduce((max, s) => Math.max(max, s.scoreLog.length), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 safe-pad"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('scoresheet')}
    >
      <div
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-[12px] border-2 border-ink bg-parchment shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-gild px-4 py-2">
          <h2 className="font-display text-3xl font-bold text-ink">{t('scoresheet')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeScoresheet')}
            className="grid h-9 w-9 place-items-center rounded-full font-hand text-xl font-bold text-ember hover:bg-wood/10 hover:text-amber-deep"
          >
            ✕
          </button>
        </div>

        <div className="overflow-auto px-4 py-3">
          <table className="w-full table-fixed border-collapse font-hand text-ink">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="w-8 px-1 py-1 text-left text-sm text-ink-soft">#</th>
                {seats.map((s) => (
                  <th
                    key={s.id}
                    className={`truncate px-1 py-1 text-center text-sm sm:text-base font-bold ${
                      s.isMe ? 'text-amber-deep' : 'text-ink'
                    }`}
                    title={s.username}
                  >
                    {s.username}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds === 0 ? (
                <tr>
                  <td
                    colSpan={seats.length + 1}
                    className="py-5 text-center font-hand text-base text-ink-soft"
                  >
                    {t('scoresheetEmpty')}
                  </td>
                </tr>
              ) : (
                Array.from({ length: rounds }).map((_, r) => (
                  <tr key={r} className="border-b border-[#d8bd92]">
                    <td className="num px-1 py-1 text-left text-sm text-ink-soft">{r + 1}</td>
                    {seats.map((s) => (
                      <td key={s.id} className="num px-1 py-1 text-center text-sm sm:text-base">
                        {s.scoreLog[r] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink">
                <td className="px-1 py-1 text-left text-sm font-bold text-ink-soft">
                  {t('nowRow')}
                </td>
                {seats.map((s) => (
                  <td
                    key={s.id}
                    className="num px-1 py-1 text-center text-base sm:text-lg font-bold text-amber-deep"
                  >
                    {s.score}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="border-t border-gild px-4 py-2 font-hand text-sm text-ink-soft">
          {t('scoresheetFooter')}
        </p>
      </div>
    </div>
  );
}
