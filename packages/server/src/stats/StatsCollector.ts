import { GameState, HAND_SIZE, MAX_CONSECUTIVE_FOLDS } from '@muushig/shared';

/** Who held each seat when the match started (immutable for the match — a bot
 *  taking over an abandoned seat does NOT reassign the result; the abandoner
 *  keeps it, so quitting a losing game still records the loss). */
export interface SeatIdentity {
  seatId: string;
  username: string;
  /** Verified Supabase user id; null for guests and bots. */
  userId: string | null;
  isBot: boolean;
}

/** One seat's outcome for one scored round. */
export interface RoundRow {
  roundNo: number;
  seatId: string;
  stayed: boolean;
  tricksWon: number;
  /** Stayed and took nothing — got "muushig'd" (+5). */
  shutOut: boolean;
  /** The dealer traded the face-up trump this round (dealer seat only). */
  navshihUsed: boolean;
  /** Stayed only because the fold cap (haranhui) forbade folding. */
  haranhuiForced: boolean;
  scoreAfter: number;
}

export interface PlayerMatchStats {
  roundsStayed: number;
  roundsFolded: number;
  tricks: number;
  shutoutsTaken: number;
  shutoutsInflicted: number;
  navshih: number;
  haranhuiForced: number;
  perfectRounds: number;
}

export interface MatchPlayer {
  userId: string | null;
  username: string;
  seatId: string;
  isBot: boolean;
  won: boolean;
  /** 1 = best final score; ties share the better placement's neighborhood by seat order. */
  placement: number;
  /** Final penalty score (≤ 0 for winners). */
  score: number;
  /** Usernames of everyone else at the table. */
  opponents: string[];
  stats: PlayerMatchStats;
}

export interface MatchRecord {
  playerCount: number;
  withBots: boolean;
  roundsPlayed: number;
  durationSeconds: number;
  players: MatchPlayer[];
  rounds: RoundRow[];
}

/**
 * Pure per-match accumulator. The room drives it from exactly three places:
 * `begin()` in startGame, `recordRound()` right after MuushigEngine.scoreRound
 * (all per-round facts are still on GameState at that moment), and `finish()`
 * in the game-over branch. `finish()` is one-shot — the structural guard
 * against a rematch double-recording the previous game.
 */
export class StatsCollector {
  private seats: SeatIdentity[] = [];
  private startedAt = 0;
  private rounds: RoundRow[] = [];
  /** seatId → consecutive folds BEFORE the current round (for haranhui detection). */
  private foldStreaks = new Map<string, number>();
  private active = false;

  begin(seats: SeatIdentity[], startedAt: number): void {
    this.seats = [...seats];
    this.startedAt = startedAt;
    this.rounds = [];
    this.foldStreaks = new Map(seats.map((s) => [s.seatId, 0]));
    this.active = true;
  }

  /** Call right after scoreRound(): reads hasResigned / tricksWon / score. */
  recordRound(state: GameState): void {
    if (!this.active) return;
    const roundNo = this.rounds.length + 1;
    for (const seat of this.seats) {
      const p = state.players.get(seat.seatId);
      if (!p) continue;
      const stayed = !p.hasResigned;
      const priorFolds = this.foldStreaks.get(seat.seatId) ?? 0;
      this.rounds.push({
        roundNo,
        seatId: seat.seatId,
        stayed,
        tricksWon: stayed ? p.tricksWon : 0,
        shutOut: stayed && p.tricksWon === 0,
        navshihUsed: stayed && seat.seatId === state.dealerId && state.trumpExchanged,
        // At the cap the engine rejects another fold, so staying there is forced.
        haranhuiForced: stayed && priorFolds >= MAX_CONSECUTIVE_FOLDS,
        scoreAfter: p.score,
      });
      this.foldStreaks.set(seat.seatId, stayed ? 0 : priorFolds + 1);
    }
  }

  /** One-shot: returns the finished record, or null if not collecting. */
  finish(state: GameState, endedAt: number): MatchRecord | null {
    if (!this.active) return null;
    this.active = false;

    const winners = new Set([...state.winners]);
    // Placement by final score ascending; state.winners already orders the
    // winning scores best-first, and seat order breaks remaining ties.
    const ranked = [...this.seats].sort((a, b) => {
      const sa = state.players.get(a.seatId)?.score ?? Number.MAX_SAFE_INTEGER;
      const sb = state.players.get(b.seatId)?.score ?? Number.MAX_SAFE_INTEGER;
      return sa - sb;
    });
    const placementBySeat = new Map(ranked.map((s, i) => [s.seatId, i + 1]));

    // A shut-out is "inflicted" by every other staying seat that took tricks
    // in that round.
    const byRound = new Map<number, RoundRow[]>();
    for (const row of this.rounds) {
      const list = byRound.get(row.roundNo) ?? [];
      list.push(row);
      byRound.set(row.roundNo, list);
    }
    const inflictedBySeat = new Map<string, number>();
    for (const rows of byRound.values()) {
      if (!rows.some((r) => r.shutOut)) continue;
      for (const r of rows) {
        if (r.stayed && r.tricksWon > 0) {
          inflictedBySeat.set(r.seatId, (inflictedBySeat.get(r.seatId) ?? 0) + 1);
        }
      }
    }

    const players: MatchPlayer[] = this.seats.map((seat) => {
      const mine = this.rounds.filter((r) => r.seatId === seat.seatId);
      const stats: PlayerMatchStats = {
        roundsStayed: mine.filter((r) => r.stayed).length,
        roundsFolded: mine.filter((r) => !r.stayed).length,
        tricks: mine.reduce((sum, r) => sum + r.tricksWon, 0),
        shutoutsTaken: mine.filter((r) => r.shutOut).length,
        shutoutsInflicted: inflictedBySeat.get(seat.seatId) ?? 0,
        navshih: mine.filter((r) => r.navshihUsed).length,
        haranhuiForced: mine.filter((r) => r.haranhuiForced).length,
        perfectRounds: mine.filter((r) => r.tricksWon === HAND_SIZE).length,
      };
      return {
        userId: seat.userId,
        username: seat.username,
        seatId: seat.seatId,
        isBot: seat.isBot,
        won: winners.has(seat.seatId),
        placement: placementBySeat.get(seat.seatId) ?? this.seats.length,
        score: state.players.get(seat.seatId)?.score ?? 0,
        opponents: this.seats.filter((s) => s.seatId !== seat.seatId).map((s) => s.username),
        stats,
      };
    });

    return {
      playerCount: this.seats.length,
      // Lobby bots only: a mid-game takeover does not demote the game.
      withBots: this.seats.some((s) => s.isBot),
      roundsPlayed: byRound.size,
      durationSeconds: Math.max(0, Math.round((endedAt - this.startedAt) / 1000)),
      players,
      rounds: this.rounds,
    };
  }

  /** Room died mid-game — drop everything (nothing is recorded). */
  abort(): void {
    this.active = false;
    this.rounds = [];
  }
}
