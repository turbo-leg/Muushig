import { type, Schema, ArraySchema } from '@colyseus/schema';
import { Card } from './Card';

export const STARTING_SCORE = 15;

export class Player extends Schema {
  @type('string') id: string = '';
  @type('string') username: string = '';
  @type('string') avatarUrl: string = '';
  @type('string') discordId: string = '';

  @type([Card]) hand = new ArraySchema<Card>();

  /** Points remaining. Game is won by reaching 0 (or below). Starts at 15. */
  @type('number') score: number = STARTING_SCORE;

  /** Scoresheet column: one entry per completed round — the new running total,
   *  or '-' for a round this player folded. */
  @type(['string']) scoreLog = new ArraySchema<string>();

  /** Tricks won in the current round (reset each round). */
  @type('number') tricksWon: number = 0;

  /** Whether this player has made their stay/resign choice this round. */
  @type('boolean') hasDecided: boolean = false;

  /** Whether this player has taken their (optional) swap this round. */
  @type('boolean') hasSwapped: boolean = false;

  /** Resigned during the decision phase — sits the round out. */
  @type('boolean') hasResigned: boolean = false;

  /** Rounds folded in a row (haranhui oroh): at the cap the player must play. */
  @type('number') consecutiveFolds: number = 0;

  @type('boolean') isReady: boolean = false;
  @type('boolean') isConnected: boolean = true;

  /** Server-driven seat: a lobby-added bot, or a takeover of an abandoned seat. */
  @type('boolean') isBot: boolean = false;

  /** Dying Ace rule: true when the player failed to open a trick with the trump Ace. */
  @type('boolean') trumpAceDead: boolean = false;

  constructor(id: string = '') {
    super();
    this.id = id;
  }
}
