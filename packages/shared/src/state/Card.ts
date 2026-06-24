import { type, Schema } from '@colyseus/schema';

export enum Suit {
  Spades = 'Spades',
  Hearts = 'Hearts',
  Diamonds = 'Diamonds',
  Clubs = 'Clubs',
  None = 'None',
}

/**
 * Muushig uses a 32-card deck: 7, 8, 9, 10, J, Q, K, A in each suit.
 * Numeric values double as the rank ordering (low → high).
 */
export enum Rank {
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
  Ace = 14,
}

export const ALL_SUITS: Suit[] = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];

export const ALL_RANKS: Rank[] = [
  Rank.Seven,
  Rank.Eight,
  Rank.Nine,
  Rank.Ten,
  Rank.Jack,
  Rank.Queen,
  Rank.King,
  Rank.Ace,
];

export class Card extends Schema {
  @type('string') suit: string;
  @type('number') rank: number;

  constructor(suit: string = Suit.None, rank: number = Rank.Seven) {
    super();
    this.suit = suit;
    this.rank = rank;
  }

  /** Stable identity key for a card, useful for set membership / dedup. */
  get key(): string {
    return `${this.suit}:${this.rank}`;
  }
}
