/**
 * The "eternal blue sky" backdrop: a deep-night gradient with a faint,
 * slowly-drifting starfield. Low contrast by design — it must never compete
 * with cards or numbers. Drift is paused under prefers-reduced-motion (handled
 * globally in index.css).
 */
export function Background() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-night">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(1200px 800px at 50% -10%, rgba(58,160,214,0.10), transparent 60%),' +
            'radial-gradient(900px 600px at 80% 110%, rgba(124,92,255,0.08), transparent 55%)',
        }}
      />
      <div
        className="absolute inset-[-20%] animate-[drift_90s_linear_infinite]"
        style={{
          backgroundImage:
            'radial-gradient(1.5px 1.5px at 20% 30%, rgba(232,236,248,0.7), transparent),' +
            'radial-gradient(1.5px 1.5px at 70% 60%, rgba(232,236,248,0.5), transparent),' +
            'radial-gradient(1px 1px at 40% 80%, rgba(232,236,248,0.5), transparent),' +
            'radial-gradient(1px 1px at 85% 20%, rgba(212,175,55,0.5), transparent),' +
            'radial-gradient(1.5px 1.5px at 55% 15%, rgba(232,236,248,0.6), transparent)',
          backgroundSize: '600px 600px',
        }}
      />
      <style>{`@keyframes drift { from { transform: translate3d(0,0,0); } to { transform: translate3d(-40px,-30px,0); } }`}</style>
    </div>
  );
}
