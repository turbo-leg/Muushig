/**
 * The tavern room backdrop: dark warm wood with a hearth glow from above.
 * Styling lives in the `.room` class (index.css) and is asset-ready — set
 * `--tex-room: url('/assets/tavern.jpg')` to drop in a painted background.
 */
export function Background() {
  return <div aria-hidden className="room fixed inset-0 -z-10" />;
}
