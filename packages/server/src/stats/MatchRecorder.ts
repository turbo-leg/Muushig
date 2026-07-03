import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabase';
import { computeEloUpdates, ELO_START, type RatedPlayer } from './elo';
import type { MatchRecord } from './StatsCollector';

export type MatchRecorderFn = (record: MatchRecord) => Promise<void>;

const RETRY_DELAYS_MS = [1_000, 4_000, 16_000];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Builds the production recorder: reads current ratings, computes Elo in TS
 * (skipped for bot games), and persists everything atomically through the
 * `record_match_v2` RPC (service role — the only writer past RLS).
 *
 * Returns null when persistence is disabled (no service credentials), so the
 * room can skip the whole path. Games without a single verified human are
 * skipped HERE, not in the room, so tests with an injected fake recorder
 * still observe payloads for guest-only games.
 */
export function createSupabaseRecorder(
  client: SupabaseClient | null = supabaseAdmin,
): MatchRecorderFn | null {
  if (!client) return null;

  return async (record: MatchRecord): Promise<void> => {
    const humans = record.players.filter((p) => p.userId !== null);
    if (humans.length === 0) return; // guest/bot-only table — nothing to persist

    // Current ratings for the humans at the table.
    const ids = humans.map((p) => p.userId!);
    const { data: statsRows, error: readError } = await client
      .from('player_stats')
      .select('user_id, rating, rating_games')
      .in('user_id', ids);
    if (readError) {
      console.error('deep-stats: failed to read ratings', readError.message);
    }
    const ratingByUser = new Map<string, { rating: number; ratingGames: number }>(
      (statsRows ?? []).map((r: { user_id: string; rating: number; rating_games: number }) => [
        r.user_id,
        { rating: r.rating ?? ELO_START, ratingGames: r.rating_games ?? 0 },
      ]),
    );

    // Rating only moves in all-human games.
    let eloUpdates = new Map<string, number>();
    if (!record.withBots) {
      const rated: RatedPlayer[] = humans.map((p) => ({
        userId: p.userId!,
        rating: ratingByUser.get(p.userId!)?.rating ?? ELO_START,
        ratingGames: ratingByUser.get(p.userId!)?.ratingGames ?? 0,
        won: p.won,
      }));
      eloUpdates = computeEloUpdates(rated);
    }

    const payload = {
      player_count: record.playerCount,
      with_bots: record.withBots,
      rounds_played: record.roundsPlayed,
      duration_seconds: record.durationSeconds,
      players: record.players.map((p) => ({
        user_id: p.userId,
        username: p.username,
        won: p.won,
        placement: p.placement,
        score: p.score,
        opponents: p.opponents,
        new_rating: p.userId ? (eloUpdates.get(p.userId) ?? null) : null,
        stats: {
          ...p.stats,
          rating_before: p.userId ? (ratingByUser.get(p.userId)?.rating ?? ELO_START) : null,
          rating_after: p.userId
            ? (eloUpdates.get(p.userId) ?? ratingByUser.get(p.userId)?.rating ?? ELO_START)
            : null,
        },
      })),
      rounds: record.rounds.map((r) => {
        const seat = record.players.find((p) => p.seatId === r.seatId);
        return {
          round_no: r.roundNo,
          user_id: seat?.userId ?? null,
          seat: seat?.username ?? r.seatId,
          is_bot: seat?.isBot ?? false,
          stayed: r.stayed,
          tricks_won: r.tricksWon,
          shut_out: r.shutOut,
          navshih_used: r.navshihUsed,
          haranhui_forced: r.haranhuiForced,
          score_after: r.scoreAfter,
        };
      }),
    };

    for (let attempt = 0; ; attempt++) {
      const { error } = await client.rpc('record_match_v2', { match: payload });
      if (!error) return;
      if (attempt >= RETRY_DELAYS_MS.length) {
        // Full payload in the log so a failed write can be replayed by hand.
        console.error('deep-stats: record_match_v2 failed', error.message, JSON.stringify(payload));
        return;
      }
      await delay(RETRY_DELAYS_MS[attempt]!);
    }
  };
}
