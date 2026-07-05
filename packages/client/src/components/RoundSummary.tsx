import { t } from '../i18n';

export interface RoundRow {
  id: string;
  username: string;
  /** Sat this round out — no score change. */
  folded: boolean;
  tricksWon: number;
  /** Running total after the round was scored. */
  total: number;
}

/**
 * Parchment plaque shown during the server's round-end pause: one line per
 * seat with the round's score movement (−tricks, the +5 shut-out, or a fold)
 * and the new running total. Purely presentational; the Table decides when
 * it appears and disappears.
 */
export function RoundSummary({ rows }: { rows: RoundRow[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center px-4">
      <div className="anim-reveal w-[min(320px,88vw)] -rotate-1 rounded-[10px] border-2 border-gild bg-parchment px-5 py-4 drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)] [box-shadow:inset_0_0_18px_rgba(0,0,0,0.45)]">
        <p className="mb-2 text-center font-hand text-2xl font-bold leading-none text-ink">
          {t('roundOver')}
        </p>
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-baseline justify-between gap-3 font-hand text-lg leading-none"
            >
              <span className="truncate font-bold text-ink">{r.username}</span>
              <span className="flex items-baseline gap-2 whitespace-nowrap">
                {r.folded ? (
                  <span className="text-ink-soft">{t('foldedRow')}</span>
                ) : r.tricksWon > 0 ? (
                  <span className="font-bold text-success">−{r.tricksWon}</span>
                ) : (
                  <span className="font-bold text-danger">+5</span>
                )}
                <span className="num text-ember">{r.total}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
