/**
 * Bot portrait pool. Every `bot-*.png` in `src/assets/avatars/` is loaded at
 * build time and handed out round-robin to seats that have no avatar of their
 * own (bots, and local-dev players without a Discord photo).
 */
const modules = import.meta.glob('../assets/avatars/bot-*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

// Sort by the numeric suffix so bot-1…bot-8 land in a stable order.
const pool: string[] = Object.entries(modules)
  .sort(([a], [b]) => {
    const n = (p: string) => Number(p.match(/bot-(\d+)/)?.[1] ?? 0);
    return n(a) - n(b);
  })
  .map(([, url]) => url);

/** Pick a deterministic portrait for a seat that lacks its own avatar. */
export function botAvatar(index: number): string | undefined {
  if (pool.length === 0) return undefined;
  return pool[((index % pool.length) + pool.length) % pool.length];
}
