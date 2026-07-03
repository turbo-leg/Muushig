import { Room, Client, Delayed } from 'colyseus';
import {
  GameState,
  Player,
  MuushigEngine,
  MuushigBot,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from '@muushig/shared';
import { parseCard, parseIndices, sanitizeString } from './roomHelpers';

// These are PER-TURN budgets: each player gets the full window when it becomes
// their turn to act (decisions and swaps are taken one player at a time).
const DEFAULT_TURN_TIME_MS = 30_000;
const DEFAULT_SWAP_TIME_MS = 60_000;
const DEFAULT_DECISION_TIME_MS = 45_000;
// How long a mid-game seat is held for the same client to reconnect (Discord
// iframe reloads are routine: device rotation, client updates, network blips).
const DEFAULT_RECONNECT_WINDOW_S = 60;
// A beat before a bot acts, so its moves read as play rather than a glitch.
const BOT_ACT_DELAY_MS = 900;
const BOT_NAMES = ['Баатар', 'Сараа', 'Дорж', 'Оюунаа', 'Тэмүүлэн'];
// Connection slots kept above the seat count so mid-game joiners can watch.
const SPECTATOR_HEADROOM = 10;

interface SpectatorProfile {
  username: string;
  avatarUrl: string;
  discordId: string;
}
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
  reconnectWindow?: number;
  botDelay?: number;
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
  private reconnectWindow = DEFAULT_RECONNECT_WINDOW_S;
  private botDelay = BOT_ACT_DELAY_MS;
  private discordInstanceId: string | null = null;
  private rematchVotes = new Set<string>();
  private rateLimit = new Map<string, number[]>();
  private botTimer: Delayed | null = null;
  private botCounter = 0;
  /** Identity of each spectator, kept for their promotion to a seat. */
  private spectatorProfiles = new Map<string, SpectatorProfile>();

  onCreate(options: CreateOptions = {}): void {
    this.setState(new GameState());

    const requested = parseInt(String(options.maxPlayers ?? MAX_PLAYERS), 10);
    const max = Number.isFinite(requested)
      ? Math.min(Math.max(requested, MIN_PLAYERS), MAX_PLAYERS)
      : MAX_PLAYERS;
    this.state.maxPlayers = max;
    // Seats are enforced in onJoin; extra connection slots carry spectators.
    this.maxClients = max + SPECTATOR_HEADROOM;

    if (typeof options.turnTimeLimit === 'number') this.turnTimeLimit = options.turnTimeLimit;
    if (typeof options.swapTimeLimit === 'number') this.swapTimeLimit = options.swapTimeLimit;
    if (typeof options.decisionTimeLimit === 'number')
      this.decisionTimeLimit = options.decisionTimeLimit;
    if (typeof options.reconnectWindow === 'number' && options.reconnectWindow >= 0)
      this.reconnectWindow = options.reconnectWindow;
    if (typeof options.botDelay === 'number' && options.botDelay >= 0)
      this.botDelay = options.botDelay;

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
    this.onMessage('addBot', (client) => this.guard(client, () => this.handleAddBot(client)));
    this.onMessage('removeBot', (client, msg) =>
      this.guard(client, () => this.handleRemoveBot(client, msg)),
    );
    this.onMessage('ping', (client, msg: { clientTime?: number }) => {
      client.send('pong', { clientTime: msg?.clientTime, serverTime: Date.now() });
    });
  }

  onJoin(client: Client, options: JoinOptions = {}): void {
    const username = sanitizeString(options.username) || `Player-${this.state.players.size + 1}`;

    // Mid-game joiners watch from the rail and are seated for the next game.
    if (this.state.phase !== 'waiting') {
      this.spectatorProfiles.set(client.sessionId, {
        username,
        avatarUrl: sanitizeString(options.avatarUrl, 256),
        discordId: sanitizeString(options.discordId),
      });
      this.state.spectators.set(client.sessionId, username);
      this.syncMetadata();
      return;
    }

    if (this.state.players.size >= this.state.maxPlayers) {
      throw new Error('Room is full');
    }
    const player = new Player(client.sessionId);
    player.username = username;
    player.avatarUrl = sanitizeString(options.avatarUrl, 256);
    player.discordId = sanitizeString(options.discordId);
    player.isConnected = true;

    this.state.players.set(client.sessionId, player);
    this.state.seatOrder.push(client.sessionId);
    if (!this.state.hostId) this.state.hostId = client.sessionId;

    this.syncMetadata();
  }

  async onLeave(client: Client, _consented?: boolean): Promise<void> {
    // Spectators come and go freely — no seat to hold.
    if (this.state.spectators.has(client.sessionId)) {
      this.state.spectators.delete(client.sessionId);
      this.spectatorProfiles.delete(client.sessionId);
      return;
    }

    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.isConnected = false;

    // Before the game starts, free the seat entirely.
    if (this.state.phase === 'waiting') {
      this.state.players.delete(client.sessionId);
      const idx = this.state.seatOrder.indexOf(client.sessionId);
      if (idx !== -1) this.state.seatOrder.splice(idx, 1);
      if (this.state.hostId === client.sessionId) {
        // Bots can't press Deal — hand the host role to the first human.
        this.state.hostId =
          this.state.seatOrder.find((id) => !this.state.players.get(id)!.isBot) ?? '';
      }
      this.syncMetadata();
      return;
    }

    // Mid-game: hold the seat for the same client to reconnect. Held even on
    // consented leaves — a Discord iframe teardown can look consented, and a
    // held seat costs nothing: the per-phase timers (auto-stay, keep-cards,
    // auto-play) keep the table moving whether or not the player returns.
    this.syncMetadata();
    if (this.reconnectWindow <= 0) return;
    try {
      await this.allowReconnection(client, this.reconnectWindow);
      const rejoined = this.state.players.get(client.sessionId);
      if (rejoined) {
        rejoined.isConnected = true;
        this.syncMetadata();
      }
    } catch {
      // Window expired (or room disposed) — a bot takes the seat over so the
      // table stops sitting out this player's full clock every turn.
      const abandoned = this.state.players.get(client.sessionId);
      if (abandoned && !abandoned.isConnected && this.state.phase !== 'waiting') {
        abandoned.isBot = true;
        this.maybeActBot();
      }
    }
  }

  onDispose(): void {
    this.clearTurnTimer();
    this.clearSwapTimer();
    this.clearDecisionTimer();
    this.botTimer?.clear();
    this.botTimer = null;
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
    // Bots don't vote — a rematch needs every human at the table.
    const humans = [...this.state.seatOrder].filter((id) => !this.state.players.get(id)!.isBot);
    if (this.rematchVotes.size >= humans.length) {
      this.rematchVotes.clear();
      for (const id of this.state.seatOrder) {
        const p = this.state.players.get(id)!;
        p.score = 15;
        p.isReady = p.isBot; // bots are always ready
      }
      this.state.winners.splice(0, this.state.winners.length);
      this.state.phase = 'waiting';
      this.promoteSpectators();
      this.syncMetadata();
    }
  }

  /** Back in the lobby: seat waiting spectators while chairs remain. */
  private promoteSpectators(): void {
    for (const sessionId of [...this.state.spectators.keys()]) {
      if (this.state.players.size >= this.state.maxPlayers) break;
      const profile = this.spectatorProfiles.get(sessionId);
      const player = new Player(sessionId);
      player.username = this.state.spectators.get(sessionId) ?? 'Player';
      player.avatarUrl = profile?.avatarUrl ?? '';
      player.discordId = profile?.discordId ?? '';
      player.isConnected = true;
      this.state.players.set(sessionId, player);
      this.state.seatOrder.push(sessionId);
      this.state.spectators.delete(sessionId);
      this.spectatorProfiles.delete(sessionId);
    }
    // The host must be someone who can press Deal.
    const host = this.state.hostId ? this.state.players.get(this.state.hostId) : null;
    if (!host || host.isBot) {
      this.state.hostId =
        this.state.seatOrder.find((id) => !this.state.players.get(id)!.isBot) ?? '';
    }
  }

  private handleAddBot(client: Client): void {
    if (this.state.phase !== 'waiting') return;
    if (client.sessionId !== this.state.hostId) return;
    if (this.state.players.size >= this.state.maxPlayers) return;

    const id = `bot-${++this.botCounter}`;
    const bot = new Player(id);
    bot.username = `${BOT_NAMES[(this.botCounter - 1) % BOT_NAMES.length]!} 🤖`;
    bot.isBot = true;
    bot.isReady = true;
    bot.isConnected = true;
    this.state.players.set(id, bot);
    this.state.seatOrder.push(id);
    this.syncMetadata();
  }

  private handleRemoveBot(client: Client, msg: unknown): void {
    if (this.state.phase !== 'waiting') return;
    if (client.sessionId !== this.state.hostId) return;
    const id = sanitizeString((msg as { id?: unknown })?.id);
    const bot = id ? this.state.players.get(id) : undefined;
    if (!bot?.isBot) return;

    this.state.players.delete(id);
    const idx = this.state.seatOrder.indexOf(id);
    if (idx !== -1) this.state.seatOrder.splice(idx, 1);
    this.syncMetadata();
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
    this.maybeActBot();
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
    this.maybeActBot();
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
    this.maybeActBot();
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

  // ──────────────────────────── Bots ────────────────────────────

  /**
   * Called on every turn handoff (each startXTimer): if the seat on turn is a
   * bot, schedule its move. The human timers stay armed underneath as a
   * fallback, but a bot acts long before they fire.
   */
  private maybeActBot(): void {
    this.botTimer?.clear();
    this.botTimer = null;
    const id = this.state.currentTurn;
    const player = id ? this.state.players.get(id) : null;
    if (!player?.isBot) return;
    if (
      this.state.phase !== 'decision' &&
      this.state.phase !== 'swap' &&
      this.state.phase !== 'playing'
    )
      return;
    this.botTimer = this.clock.setTimeout(() => this.actBot(id), this.botDelay);
  }

  /** Performs one bot action for whichever phase the game is in. */
  private actBot(id: string): void {
    if (this.state.currentTurn !== id) return;
    const player = this.state.players.get(id);
    if (!player?.isBot) return;

    if (this.state.phase === 'decision') {
      if (!player.hasDecided) {
        try {
          MuushigEngine.decide(this.state, id, MuushigBot.chooseStay(this.state, id));
        } catch {
          /* fall through — afterDecision re-evaluates and the timer backstops */
        }
      }
      this.afterDecision();
    } else if (this.state.phase === 'swap') {
      if (!player.hasSwapped && !player.hasResigned) {
        try {
          MuushigEngine.swapCards(this.state, id, MuushigBot.chooseSwapIndices(this.state, id));
        } catch {
          /* fall through */
        }
      }
      this.maybeBeginPlay();
    } else if (this.state.phase === 'playing') {
      const card = MuushigBot.chooseCard(this.state, id);
      if (!card) return;
      try {
        MuushigEngine.playCard(this.state, id, card);
      } catch {
        return; // engine rejected — the turn timer will auto-play a legal card
      }
      this.afterPlay();
    }
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
      spectatorCount: this.state.spectators.size,
      phase: this.state.phase,
    }).catch(() => {});
  }
}
