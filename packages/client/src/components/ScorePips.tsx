/** 15 pips; lit pips = points remaining (lower is better — first to 0 wins). */
export function ScorePips({ score }: { score: number }) {
  const lit = Math.max(0, Math.min(15, score));
  return (
    <div className="flex max-w-[96px] flex-wrap gap-0.5" aria-label={`${score} points`}>
      {Array.from({ length: 15 }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < lit ? 'bg-amber-deep' : 'bg-ink-soft/25'}`}
        />
      ))}
    </div>
  );
}
