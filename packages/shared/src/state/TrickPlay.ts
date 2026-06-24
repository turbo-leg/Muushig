import { type, Schema } from '@colyseus/schema';
import { Card } from './Card';

/** A single card played into the current trick, tagged with who played it. */
export class TrickPlay extends Schema {
  @type('string') playerId: string;
  @type(Card) card: Card;

  constructor(playerId: string = '', card: Card = new Card()) {
    super();
    this.playerId = playerId;
    this.card = card;
  }
}
