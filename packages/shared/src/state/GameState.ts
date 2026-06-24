import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';
import { Player } from './Player';
import { Card } from './Card';
import { TrickPlay } from './TrickPlay';

export type Phase = 'waiting' | 'swap' | 'playing' | 'finished';

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();

  /** Face-down draw pile used during the swap phase. */
  @type([Card]) stock = new ArraySchema<Card>();

  /** The turned-up card whose suit sets the trump suit for the round. */
  @type(Card) trumpCard: Card = new Card();
  @type('string') trumpSuit: string = '';

  /** Cards played into the trick currently in progress. */
  @type([TrickPlay]) currentTrick = new ArraySchema<TrickPlay>();

  /** Suit led in the current trick ('' before the lead card is played). */
  @type('string') ledSuit: string = '';

  /** Seat id of the player who leads the current trick. */
  @type('string') leaderId: string = '';

  /** Seat id of the player whose turn it is to act. */
  @type('string') currentTurn: string = '';

  /** Turn order of seat ids (resigned players are skipped during play). */
  @type(['string']) seatOrder = new ArraySchema<string>();

  @type('string') phase: string = 'waiting';
  @type('string') hostId: string = '';
  @type('number') maxPlayers: number = 5;

  /** Number of tricks played so far in the current round. */
  @type('number') tricksPlayed: number = 0;

  /** Seat ids of players who have reached 0 and won (in finishing order). */
  @type(['string']) winners = new ArraySchema<string>();
}
