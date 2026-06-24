import { Room, Client, Delayed } from 'colyseus';
import { GameState, Player, MuushigEngine, MIN_PLAYERS, MAX_PLAYERS } from '@muushig/shared';
import { parseCard, parseIndices, sanitizeString } from './roomHelpers';

const DEFAULT_TURN_TIME_MS = 30_000;
const DEFAULT_SWAP_TIME_MS = 60_000;
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
}

/**
 * Authoritative Colyseus room for a Muushig game. Owns the real {@link GameState}
 * and delegates every rule decision to {@link MuushigEngine}; clients only send
 * intents (`ready`, `start`, `swap`, `resign`, `playCard`, `rematch`).
 *
 * Phase machine: `waiting → swap → playing → finished`, looping
 * `playing → swap` between rounds until a player reaches a winning score.
 */
export class MuushigRoom extends Room<GameState> {
  private turnTimer: Delayed | null = null;
  private swapTimer: Delayed | null = null;
  private turnTimeLimit = DEFAULT_TURN_TIME_MS;
  private swapTimeLimit = DEFAULT_SWAP_TIME_MS;
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

    this.setPrivate(!!options.isPrivate);
    this.discordInstanceId = options.discordInstanceId ?? null;
    this.syncMetadata();

    this.onMessage('ready', (client) => this.guard(client, () => this.handleReady(client)));
    this.onMessage('start', (client) => this.guard(client, () => this.handleStart(client)));
    this.onMessage('swap', (client, msg) => this.guard(client, () => this.handleSwap(client, msg)));
    this.onMessage('resign', (client) => this.guard(client, () => this.handleResign(client)));
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

  private handleSwap(client: Client, msg: unknown): void {
    if (this.state.phase !== 'swap') return;
    const indices = parseIndices((msg as { indices?: unknown })?.indices);
    try {
      MuushigEngine.swapCards(this.state, client.sessionId, indices);
    } catch {
      return; // illegal swap (already swapped / resigned) — ignore
    }
    this.maybeBeginPlay();
  }

  private handleResign(client: Client): void {
    if (this.state.phase !== 'swap') return;
    try {
      MuushigEngine.resign(this.state, client.sessionId);
    } catch {
      return;
    }
    this.maybeBeginPlay();
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
    this.startSwapTimer();
  }

  /** Advances to trick play once every player has swapped or resigned. */
  private maybeBeginPlay(): void {
    if (!MuushigEngine.allSwapsComplete(this.state)) return;
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
    MuushigEngine.scoreRound(this.state);

    if (MuushigEngine.isGameOver(this.state)) {
      this.state.phase = 'finished';
      this.broadcast('gameOver', { winners: [...this.state.winners] });
      this.syncMetadata();
      return;
    }

    MuushigEngine.dealRound(this.state);
    this.syncMetadata();
    this.startSwapTimer();
  }

  // ──────────────────────────── Timers ────────────────────────────

  private startSwapTimer(): void {
    this.clearSwapTimer();
    if (this.swapTimeLimit <= 0) return;
    this.swapTimer = this.clock.setTimeout(() => {
      // Auto-complete anyone who didn't act: they keep their dealt cards.
      for (const id of this.state.seatOrder) {
        const p = this.state.players.get(id)!;
        if (!p.hasSwapped) p.hasSwapped = true;
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
