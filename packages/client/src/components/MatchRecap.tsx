import { t } from '../i18n';

export interface RecapSummary {
  roundsTotal: number;
  roundsStayed: number;
  tricks: number;
  muushigd: number;
  perfectRounds: number;
}

/**
 * Derives this match's personal recap from the player's own synced scoreLog —
 * entries are '-' (folded) or the running total after the round, starting from
 * 15, so each numeric step reveals the round: a drop of N = N tricks, a rise
 * of 5 = stayed and got muushig'd.
 */
export function summarizeScoreLog(scoreLog: string[], startingScore = 15): RecapSummary {
  let prev = startingScore;
  const summary: RecapSummary = {
    roundsTotal: scoreLog.length,
    roundsStayed: 0,
    tricks: 0,
    muushigd: 0,
    perfectRounds: 0,
  };
  for (const cell of scoreLog) {
    if (cell === '-') continue;
    const cur = parseInt(cell, 10);
    if (Number.isNaN(cur)) continue;
    summary.roundsStayed += 1;
    const delta = prev - cur; // positive = tricks taken, −5 = shut out
    if (delta > 0) summary.tricks += delta;
    if (delta === 5) summary.perfectRounds += 1;
    if (delta === -5) summary.muushigd += 1;
    prev = cur;
  }
  return summary;
}

/** Post-game personal recap strip — pure client-side, no reads. */
export function MatchRecap({ scoreLog }: { scoreLog: string[] }) {
  const s = summarizeScoreLog(scoreLog);
  if (s.roundsTotal === 0) return null;

  const chips: string[] = [
    t('recapStayed', { stayed: s.roundsStayed, total: s.roundsTotal }),
    t('recapTricks', { n: s.tricks }),
  ];
  if (s.muushigd > 0) chips.push(t('recapMuushigd', { n: s.muushigd }));
  if (s.perfectRounds > 0) chips.push(t('recapPerfect', { n: s.perfectRounds }));

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <p className="font-hand text-sm font-bold uppercase tracking-wider text-cream/60">
        {t('recapTitle')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {chips.map((c, i) => (
          <span
            key={i}
            className="rounded-full border border-[#c9a56e] bg-parchment px-3 py-0.5 font-hand text-sm text-ink shadow-sm"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
