/** One falling coin of the game-end celebration (styling via CSS vars). */
function Coin({ delay, x, drift }: { delay: number; x: number; drift: number }) {
  return (
    <svg
      className="anim-coin-fall absolute -top-8 h-6 w-6"
      style={
        {
          left: `${x}%`,
          '--coin-delay': `${delay}s`,
          '--coin-drift': `${drift}px`,
        } as React.CSSProperties
      }
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="9" fill="#d98e04" stroke="#3a2a1e" strokeWidth="1.5" />
      <circle
        cx="10"
        cy="10"
        r="6.5"
        fill="none"
        stroke="#3a2a1e"
        strokeWidth="0.5"
        strokeDasharray="1.5 1"
        opacity="0.4"
      />
    </svg>
  );
}

// Deterministic scatter so re-renders don't reshuffle the rain.
const COINS = Array.from({ length: 14 }, (_, i) => ({
  delay: (i * 0.23) % 1.6,
  x: (i * 37 + 11) % 100,
  drift: ((i * 53) % 60) - 30,
}));

/**
 * Game-over overlay: a shower of tavern coins and a winner plaque. Pointer
 * events pass through so the rematch button below stays clickable; motion is
 * killed by the global reduced-motion / low-perf rules.
 */
export function Celebration({ winnerNames }: { winnerNames: string[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {COINS.map((c, i) => (
        <Coin key={i} {...c} />
      ))}
      <div className="absolute left-1/2 top-[26%] w-[min(340px,88vw)] -translate-x-1/2 rotate-1">
        <div className="anim-reveal rounded-[10px] border-2 border-amber-deep bg-parchment px-6 py-4 text-center drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)] [box-shadow:inset_0_0_18px_rgba(120,80,40,0.2)]">
          <p className="font-hand text-3xl font-bold leading-tight text-ink">
            🏆 {winnerNames.join(' & ') || 'Someone'} wins the pot!
          </p>
        </div>
      </div>
    </div>
  );
}
