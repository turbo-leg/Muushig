/** A rated human seat at the end of a finished match. */
export interface RatedPlayer {
  userId: string;
  rating: number;
  /** Rated games completed before this one (drives the placement K-factor). */
  ratingGames: number;
  won: boolean;
}

export const ELO_START = 1000;
/** Standard K once established. */
const K_ESTABLISHED = 32;
/** Higher K for the first placement games so new players settle quickly. */
const K_PLACEMENT = 48;
const PLACEMENT_GAMES = 10;

/**
 * Multiplayer Elo: each player is scored against the average rating of the
 * OTHER rated players at the table — winners take 1, everyone else 0 (Muushig
 * can produce multiple winners in one round; they all score 1).
 *
 * Computed in server TS rather than SQL so it lives next to the rest of the
 * game logic under vitest; record_match_v2 just persists the new values.
 * Concurrent-update races are practically impossible (a player occupies one
 * seat in one live game), and match_rounds keeps enough history to recompute
 * ratings retroactively if the formula ever moves.
 *
 * @returns userId → new rating. Empty when fewer than 2 rated players.
 */
export function computeEloUpdates(players: RatedPlayer[]): Map<string, number> {
  const updates = new Map<string, number>();
  if (players.length < 2) return updates;

  for (const p of players) {
    const others = players.filter((o) => o.userId !== p.userId);
    const avgOpp = others.reduce((sum, o) => sum + o.rating, 0) / others.length;
    const expected = 1 / (1 + 10 ** ((avgOpp - p.rating) / 400));
    const actual = p.won ? 1 : 0;
    const k = p.ratingGames < PLACEMENT_GAMES ? K_PLACEMENT : K_ESTABLISHED;
    updates.set(p.userId, Math.round(p.rating + k * (actual - expected)));
  }
  return updates;
}
