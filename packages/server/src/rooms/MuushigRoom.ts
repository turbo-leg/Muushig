import { Room, Client, Delayed } from 'colyseus';
import { GameState, Player, MuushigEngine, MIN_PLAYERS, MAX_PLAYERS } from '@muushig/shared';
import { parseCard, parseIndices, sanitizeString } from './roomHelpers';

// These are PER-TURN budgets: each player gets the full window when it becomes
// their turn to act (decisions and swaps are taken one player at a time).
const DEFAULT_TURN_TIME_MS = 30_000;
const DEFAULT_SWAP_TIME_MS = 60_000;
const DEFAULT_DECISION_TIME_MS = 45_000;
const RATE_LIMIT_MAX = 15; // messages per window
const RATE_LIMIT_WINDOW_MS = 1_000;

interface JoinOptions {
  username?: string;
  avatarUrl?: string;
  discordId?: string;
}

interface CreateOptions extends JoinOptions {
  maxPlayers?: number | string;
  isPrivate?: boolean;
  discordInstanceId?: string;
  turnTimeLimit?: number;
  swapTimeLimit?: number;
  decisionTimeLimit?: number;
}

/**
 * Authoritative Colyseus room for a Muushig game. Owns the real {@link GameState}
 * and delegates every rule decision to {@link MuushigEngine}; clients only send
 * intents (`ready`, `start`, `stay`, `resign`, `swap`, `playCard`, `rematch`).
 *
 * Phase machine: `waiting → decision → swap → playing → finished`, looping
 * `playing → decision` between rounds until a player reaches a winning score.
 * In `decision` each player chooses to stay or resign; in `swap` the stayers
 * draw replacements.
 */
export class MuushigRoom extends Room<GameState> {
  private turnTimer: Delayed | null = null;
  private swapTimer: Delayed | null = null;
  private decisionTimer: Delayed | null = null;
  private turnTimeLimit = DEFAULT_TURN_TIME_MS;
  private swapTimeLimit = DEFAULT_SWAP_TIME_MS;
  private decisionTimeLimit = DEFAULT_DECISION_TIME_MS;
  private discordInstanceId: string | null = null;
  private rematchVotes = new Set<string>();
  private rateLimit = new Map<string, number[]>();

  onCreate(options: CreateOptions = {}): void {
    this.setState(new GameState());

    const requested = parseInt(String(options.maxPlayers ?? MAX_PLAYERS), 10);
    const max = Number.isFinite(requested)
      ? Math.min(Math.max(requested, MIN_PLAYERS), MAX_PLAYERS)
      : MAX_PLAYERS;
    this.state.maxPlayers = max;
    this.maxClients = max;

    if (typeof options.turnTimeLimit === 'number') this.turnTimeLimit = options.turnTimeLimit;
    if (typeof options.swapTimeLimit === 'number') this.swapTimeLimit = options.swapTimeLimit;
    if (typeof options.decisionTimeLimit === 'number')
      this.decisionTimeLimit = options.decisionTimeLimit;

    this.setPrivate(!!options.isPrivate);
    this.discordInstanceId = options.discordInstanceId ?? null;
    this.syncMetadata();

    this.onMessage('ready', (client) => this.guard(client, () => this.handleReady(client)));
    this.onMessage('start', (client) => this.guard(client, () => this.handleStart(client)));
    this.onMessage('stay', (client) => this.guard(client, () => this.handleDecide(client, true)));
    this.onMessage('resign', (client) =>
      this.guard(client, () => this.handleDecide(client, false)),
    );
    this.onMessage('swap', (client, msg) => this.guard(client, () => this.handleSwap(client, msg)));
    this.onMessage('exchangeTrump', (client, msg) =>
      this.guard(client, () => this.handleExchangeTrump(client, msg)),
    );
    this.onMessage('playCard', (client, msg) =>
      this.guard(client, () => this.handlePlayCard(client, msg)),
    );
    this.onMessage('rematch', (client) => this.guard(client, () => this.handleRematch(client)));
    this.onMessage('ping', (client, msg: { clientTime?: number }) => {
      client.send('pong', { clientTime: msg?.clientTime, serverTime: Date.now() });
    });
  }

  onJoin(client: Client, options: JoinOptions = {}): void {
    if (this.state.phase !== 'waiting') {
      throw new Error('Game already in progress');
    }
    const player = new Player(client.sessionId);
    player.username = sanitizeString(options.username) || `Player-${this.state.players.size + 1}`;
    player.avatarUrl = sanitizeString(options.avatarUrl, 256);
    player.discordId = sanitizeString(options.discordId);
    player.isConnected = true;

    this.state.players.set(client.sessionId, player);
    this.state.seatOrder.push(client.sessionId);
    if (!this.state.hostId) this.state.hostId = client.sessionId;

    this.syncMetadata();
  }

  onLeave(client: Client, _consented?: boolean): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.isConnected = false;

    // Before the game starts, free the seat entirely.
    if (this.state.phase === 'waiting') {
      this.state.players.delete(client.sessionId);
      const idx = this.state.seatOrder.indexOf(client.sessionId);
      if (idx !== -1) this.state.seatOrder.splice(idx, 1);
      if (this.state.hostId === client.sessionId) {
        this.state.hostId = this.state.seatOrder[0] ?? '';
      }
    }
    this.syncMetadata();
  }

  onDispose(): void {
    this.clearTurnTimer();
    this.clearSwapTimer();
    this.clearDecisionTimer();
  }

  // ──────────────────────────── Handlers ────────────────────────────

  private handleReady(client: Client): void {
    if (this.state.phase !== 'waiting') return;
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.isReady = !player.isReady;
  }

  private handleStart(client: Client): void {
    if (this.state.phase !== 'waiting') return;
    if (client.sessionId !== this.state.hostId) return;
    if (this.state.players.size < MIN_PLAYERS) return;
    for (const id of this.state.seatOrder) {
      if (!this.state.players.get(id)!.isReady) return;
    }
    this.startGame();
  }

  private handleDecide(client: Client, stay: boolean): void {
    if (this.state.phase !== 'decision') return;
    // Decisions go in order, clockwise from the amankhuzuu.
    if (this.state.currentTurn !== client.sessionId) return;
    try {
      MuushigEngine.decide(this.state, client.sessionId, stay);
    } catch {
      return;
    }
    this.afterDecision();
  }

  private handleSwap(client: Client, msg: unknown): void {
    if (this.state.phase !== 'swap') return;
    // Swaps go in order, clockwise from the amankhuzuu.
    if (this.state.currentTurn !== client.sessionId) return;
    const indices = parseIndices((msg as { indices?: unknown })?.indices);
    try {
      MuushigEngine.swapCards(this.state, client.sessionId, indices);
    } catch {
      return; // illegal swap (already swapped / resigned) — ignore
    }
    this.maybeBeginPlay();
  }

  /** The dealer exchanges the face-up trump card for one hand card (anytime pre-play). */
  private handleExchangeTrump(client: Client, msg: unknown): void {
    if (this.state.phase !== 'swap') return;
    const raw = (msg as { index?: unknown })?.index;
    const index = typeof raw === 'number' && Number.isInteger(raw) ? raw : -1;
    try {
      MuushigEngine.exchangeTrump(this.state, client.sessionId, index);
    } catch {
      return; // not the dealer / already exchanged / bad index — ignore
    }
  }

  private handlePlayCard(client: Client, msg: unknown): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.currentTurn !== client.sessionId) return;
    const card = parseCard(msg);
    if (!card) return;
    try {
      MuushigEngine.playCard(this.state, client.sessionId, card);
    } catch {
      return; // illegal move — ignore and let the client retry
    }
    this.afterPlay();
  }

  private handleRematch(client: Client): void {
    if (this.state.phase !== 'finished') return;
    if (!this.state.players.has(client.sessionId)) return;
    this.rematchVotes.add(client.sessionId);
    if (this.rematchVotes.size >= this.state.players.size) {
      this.rematchVotes.clear();
      for (const id of this.state.seatOrder) {
        const p = this.state.players.get(id)!;
        p.score = 15;
        p.isReady = false;
      }
      this.state.winners.splice(0, this.state.winners.length);
      this.state.phase = 'waiting';
      this.syncMetadata();
    }
  }

  // ──────────────────────────── Flow ────────────────────────────

  private startGame(): void {
    MuushigEngine.initializeGame(this.state, [...this.state.seatOrder]);
    this.syncMetadata();
    this.startDecisionTimer();
  }

  /** Advances decision → swap once everyone has chosen to stay or resign. */
  private afterDecision(): void {
    if (!MuushigEngine.allDecided(this.state)) {
      // Hand the clock to the next player to bid/fold (a fresh per-turn window).
      this.startDecisionTimer();
      return;
    }
    this.clearDecisionTimer();
    MuushigEngine.beginSwap(this.state);
    this.syncMetadata();
    // Starts the first swapper's timer, or finishes if everyone resigned.
    this.maybeBeginPlay();
  }

  /** Advances to trick play once every staying player has swapped. */
  private maybeBeginPlay(): void {
    if (!MuushigEngine.allSwapsComplete(this.state)) {
      // Hand the clock to the next staying player to swap.
      if (this.state.phase === 'swap') this.startSwapTimer();
      return;
    }
    this.clearSwapTimer();
    MuushigEngine.beginPlay(this.state);
    if (this.state.phase === 'finished') {
      // Everyone resigned — nothing to play; score and move on.
      this.concludeRound();
      return;
    }
    this.syncMetadata();
    this.startTurnTimer();
  }

  /** Resolves a completed trick and either continues, ends the round, or ends play. */
  private afterPlay(): void {
    if (MuushigEngine.isTrickComplete(this.state)) {
      MuushigEngine.resolveTrick(this.state);
      if (MuushigEngine.isRoundComplete(this.state)) {
        this.concludeRound();
        return;
      }
    }
    this.startTurnTimer();
  }

  private concludeRound(): void {
    this.clearTurnTimer();
    this.clearSwapTimer();
    this.clearDecisionTimer();
    MuushigEngine.scoreRound(this.state);

    if (MuushigEngine.isGameOver(this.state)) {
      this.state.phase = 'finished';
      this.broadcast('gameOver', { winners: [...this.state.winners] });
      this.syncMetadata();
      return;
    }

    MuushigEngine.dealRound(this.state);
    this.syncMetadata();
    this.startDecisionTimer();
  }

  // ──────────────────────────── Timers ────────────────────────────

  private startDecisionTimer(): void {
    this.clearDecisionTimer();
    if (this.decisionTimeLimit <= 0) return;
    this.decisionTimer = this.clock.setTimeout(() => {
      if (this.state.phase !== 'decision') return;
      // The player on turn ran out of time → default to staying (play their hand).
      const id = this.state.currentTurn;
      const p = id ? this.state.players.get(id) : null;
      if (p && !p.hasDecided) {
        try {
          MuushigEngine.decide(this.state, id, true);
        } catch {
          /* ignore — afterDecision will re-evaluate */
        }
      }
      this.afterDecision();
    }, this.decisionTimeLimit);
  }

  private startSwapTimer(): void {
    this.clearSwapTimer();
    if (this.swapTimeLimit <= 0) return;
    this.swapTimer = this.clock.setTimeout(() => {
      if (this.state.phase !== 'swap') return;
      // The player on turn ran out of time → keep their dealt cards (swap none).
      const id = this.state.currentTurn;
      const p = id ? this.state.players.get(id) : null;
      if (p && !p.hasSwapped && !p.hasResigned) {
        try {
          MuushigEngine.swapCards(this.state, id, []);
        } catch {
          /* ignore — maybeBeginPlay will re-evaluate */
        }
      }
      this.maybeBeginPlay();
    }, this.swapTimeLimit);
  }

  private startTurnTimer(): void {
    this.clearTurnTimer();
    if (this.turnTimeLimit <= 0) return;
    this.turnTimer = this.clock.setTimeout(() => this.autoPlayTurn(), this.turnTimeLimit);
  }

  /** Plays the first legal card for whoever is on turn (timeout / disconnect). */
  private autoPlayTurn(): void {
    if (this.state.phase !== 'playing') return;
    const turnId = this.state.currentTurn;
    const player = this.state.players.get(turnId);
    if (!player) return;
    const legal = MuushigEngine.legalMoves(
      [...player.hand] as Parameters<typeof MuushigEngine.legalMoves>[0],
      [...this.state.currentTrick] as Parameters<typeof MuushigEngine.legalMoves>[1],
      this.state.ledSuit,
      this.state.trumpSuit,
    );
    const card = legal[0];
    if (!card) return;
    MuushigEngine.playCard(this.state, turnId, card);
    this.afterPlay();
  }

  private clearTurnTimer(): void {
    this.turnTimer?.clear();
    this.turnTimer = null;
  }

  private clearSwapTimer(): void {
    this.swapTimer?.clear();
    this.swapTimer = null;
  }

  private clearDecisionTimer(): void {
    this.decisionTimer?.clear();
    this.decisionTimer = null;
  }

  // ──────────────────────────── Utilities ────────────────────────────

  private guard(client: Client, fn: () => void): void {
    if (this.isRateLimited(client.sessionId)) return;
    fn();
  }

  private isRateLimited(sessionId: string): boolean {
    const now = Date.now();
    const hits = (this.rateLimit.get(sessionId) ?? []).filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS,
    );
    hits.push(now);
    this.rateLimit.set(sessionId, hits);
    return hits.length > RATE_LIMIT_MAX;
  }

  private syncMetadata(): void {
    this.setMetadata({
      discordInstanceId: this.discordInstanceId,
      maxPlayers: this.state.maxPlayers,
      playerCount: this.state.players.size,
      phase: this.state.phase,
    }).catch(() => {});
  }
}
