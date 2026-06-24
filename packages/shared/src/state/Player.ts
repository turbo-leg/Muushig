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

  /** Tricks won in the current round (reset each round). */
  @type('number') tricksWon: number = 0;

  /** Whether this player has taken their (optional) swap this round. */
  @type('boolean') hasSwapped: boolean = false;

  /** Resigned before the round began — sits the round out. */
  @type('boolean') hasResigned: boolean = false;

  @type('boolean') isReady: boolean = false;
  @type('boolean') isConnected: boolean = true;

  constructor(id: string = '') {
    super();
    this.id = id;
  }
}
