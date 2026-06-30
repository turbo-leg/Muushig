import { useRef, useState, type ReactNode } from 'react';

interface Props {
  onConfirm: () => void;
  /** Hold duration in ms before confirming. */
  holdMs?: number;
  className?: string;
  children: ReactNode;
  /** Mongolian (Cyrillic) subtitle, matching the coin buttons. */
  sub?: ReactNode;
}

/** True when motion should be reduced (user setting or hot device). */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.dataset.perf === 'low') return true;
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * A deliberate, press-and-hold confirm button — used for the catastrophic Fold
 * decision so a stray tap can't ruin a round. A quick tap does nothing; the
 * action only fires after holding through the fill. Under reduced motion (or a
 * hot device) it falls back to a two-tap "Confirm?" instead of a hold.
 */
export function HoldButton({ onConfirm, holdMs = 600, className = '', children, sub }: Props) {
  const [progress, setProgress] = useState(0); // 0..1 fill while held
  const [armed, setArmed] = useState(false); // reduced-motion two-tap state
  const raf = useRef<number | null>(null);
  const startAt = useRef(0);

  const cancelHold = () => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
    setProgress(0);
  };

  const tick = () => {
    const p = Math.min(1, (performance.now() - startAt.current) / holdMs);
    setProgress(p);
    if (p >= 1) {
      cancelHold();
      onConfirm();
    } else {
      raf.current = requestAnimationFrame(tick);
    }
  };

  const beginHold = () => {
    if (prefersReducedMotion()) return; // click handles the two-tap fallback
    startAt.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };

  const onClick = () => {
    if (!prefersReducedMotion()) return; // hold path handles confirmation
    if (armed) {
      setArmed(false);
      onConfirm();
    } else {
      setArmed(true);
      window.setTimeout(() => setArmed(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onPointerDown={beginHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onClick={onClick}
      aria-label="Hold to fold"
      className={`btn-coin btn-coin--grey relative overflow-hidden ${className}`}
    >
      <span className="relative z-10 text-base font-bold leading-none">
        {armed ? 'Confirm?' : children}
      </span>
      {sub != null && (
        <span className="relative z-10 mt-0.5 text-[10px] leading-none opacity-80">{sub}</span>
      )}
      {progress > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 bg-danger/60"
          style={{ height: `${progress * 100}%` }}
        />
      )}
    </button>
  );
}
