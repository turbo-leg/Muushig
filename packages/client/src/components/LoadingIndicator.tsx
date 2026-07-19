import { useEffect, useRef } from 'react';
// The SVG-only "light" player: no canvas/html renderers, no remote fetches —
// safe under the Discord Activity CSP (everything ships in the bundle).
import lottie from 'lottie-web/build/player/lottie_light';
import animationData from '../assets/finding-game.json';

/**
 * The tavern loading spinner — a bundled Lottie animation shown while we
 * settle in (auth loading, table connecting).
 */
/* The animation's content sits small inside its 512px canvas, so the box is
   oversized and the negative margins trim the built-in padding. */
export function LoadingIndicator({ className = '-my-16 h-56 w-56' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anim = lottie.loadAnimation({
      container: ref.current,
      renderer: 'svg',
      loop: true,
      autoplay: !reduceMotion,
      animationData,
    });
    // Reduced motion: hold a readable mid-animation frame instead of looping.
    if (reduceMotion) anim.goToAndStop(10, true);
    return () => anim.destroy();
  }, []);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
