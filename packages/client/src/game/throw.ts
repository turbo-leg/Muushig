/**
 * Deterministic tilt for a card, derived from a key (e.g. its suit:rank). Stable
 * across re-renders so a card thrown on the table keeps the same natural angle.
 * Returns degrees in [-range, +range].
 */
export function tiltFor(key: string, range = 5): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const unit = ((h >>> 0) % 1000) / 1000; // 0..1
  return Math.round((unit * 2 - 1) * range * 10) / 10;
}
