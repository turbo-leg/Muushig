import { describe, test, expect } from 'vitest';
import { MuushigEngine } from '../src/engine/MuushigEngine';
import { Card, Suit, Rank } from '../src/state/Card';
import { TrickPlay } from '../src/state/TrickPlay';
import { c, buildPlayingState } from './helpers';

const TRUMP = Suit.Spades;

describe('beats()', () => {
  test('any trump beats any non-trump', () => {
    expect(
      MuushigEngine.beats(c(Suit.Spades, Rank.Seven), c(Suit.Hearts, Rank.Ace), Suit.Hearts, TRUMP),
    ).toBe(true);
  });

  test('non-trump can never beat a trump', () => {
    expect(
      MuushigEngine.beats(c(Suit.Hearts, Rank.Ace), c(Suit.Spades, Rank.Seven), Suit.Hearts, TRUMP),
    ).toBe(false);
  });

  test('higher trump beats lower trump; lower does not', () => {
    expect(
      MuushigEngine.beats(
        c(Suit.Spades, Rank.King),
        c(Suit.Spades, Rank.Seven),
        Suit.Hearts,
        TRUMP,
      ),
    ).toBe(true);
    expect(
      MuushigEngine.beats(
        c(Suit.Spades, Rank.Seven),
        c(Suit.Spades, Rank.King),
        Suit.Hearts,
        TRUMP,
      ),
    ).toBe(false);
  });

  test('within the led suit, higher rank beats lower', () => {
    expect(
      MuushigEngine.beats(
        c(Suit.Hearts, Rank.King),
        c(Suit.Hearts, Rank.Seven),
        Suit.Hearts,
        TRUMP,
      ),
    ).toBe(true);
    expect(
      MuushigEngine.beats(
        c(Suit.Hearts, Rank.Seven),
        c(Suit.Hearts, Rank.King),
        Suit.Hearts,
        TRUMP,
      ),
    ).toBe(false);
  });

  test('off-suit non-trump never beats', () => {
    expect(
      MuushigEngine.beats(
        c(Suit.Diamonds, Rank.Ace),
        c(Suit.Hearts, Rank.Seven),
        Suit.Hearts,
        TRUMP,
      ),
    ).toBe(false);
  });
});

describe('legalMoves()', () => {
  test('the leader may play anything', () => {
    const hand = [c(Suit.Hearts, Rank.Seven), c(Suit.Clubs, Rank.Nine)];
    expect(MuushigEngine.legalMoves(hand, [], '', TRUMP)).toHaveLength(2);
  });

  test('a follower must play a higher card of the led suit when able', () => {
    const state = buildPlayingState(
      {
        a: [c(Suit.Hearts, Rank.Seven)],
        b: [c(Suit.Hearts, Rank.Eight), c(Suit.Diamonds, Rank.Ace)],
      },
      TRUMP,
    );
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.Seven));

    const legal = MuushigEngine.legalMoves(
      [...state.players.get('b')!.hand] as Card[],
      [...state.currentTrick] as TrickPlay[],
      state.ledSuit,
      TRUMP,
    );
    expect(legal.map((card) => card.key)).toEqual(['Hearts:8']);
  });

  test('a follower with no higher led card but a trump must play the trump', () => {
    const state = buildPlayingState(
      { a: [c(Suit.Hearts, Rank.King)], b: [c(Suit.Spades, Rank.Seven), c(Suit.Clubs, Rank.Nine)] },
      TRUMP,
    );
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.King));

    const legal = MuushigEngine.legalMoves(
      [...state.players.get('b')!.hand] as Card[],
      [...state.currentTrick] as TrickPlay[],
      state.ledSuit,
      TRUMP,
    );
    expect(legal.map((card) => card.key)).toEqual(['Spades:7']);
  });

  test('must follow suit even when it cannot win — may NOT trump while holding the led suit', () => {
    const state = buildPlayingState(
      { a: [c(Suit.Hearts, Rank.King)], b: [c(Suit.Hearts, Rank.Seven), c(Suit.Spades, Rank.Ace)] },
      TRUMP, // Spades is trump; b holds the Ace of trumps but also a Heart
    );
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.King));

    const legal = MuushigEngine.legalMoves(
      [...state.players.get('b')!.hand] as Card[],
      [...state.currentTrick] as TrickPlay[],
      state.ledSuit,
      TRUMP,
    );
    // Must follow the led Heart, cannot play the trump Ace.
    expect(legal.map((card) => card.key)).toEqual(['Hearts:7']);
  });

  test('among led-suit cards, must play one higher than the highest led card on the table', () => {
    const state = buildPlayingState(
      { a: [c(Suit.Hearts, Rank.King)], b: [c(Suit.Hearts, Rank.Eight), c(Suit.Hearts, Rank.Ace)] },
      TRUMP,
    );
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.King));

    const legal = MuushigEngine.legalMoves(
      [...state.players.get('b')!.hand] as Card[],
      [...state.currentTrick] as TrickPlay[],
      state.ledSuit,
      TRUMP,
    );
    expect(legal.map((card) => card.key)).toEqual(['Hearts:14']); // Ace beats King; the 8 cannot
  });

  test('a follower who cannot beat may play any card', () => {
    const state = buildPlayingState(
      {
        a: [c(Suit.Hearts, Rank.King)],
        b: [c(Suit.Diamonds, Rank.Eight), c(Suit.Clubs, Rank.Nine)],
      },
      TRUMP,
    );
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.King));

    const legal = MuushigEngine.legalMoves(
      [...state.players.get('b')!.hand] as Card[],
      [...state.currentTrick] as TrickPlay[],
      state.ledSuit,
      TRUMP,
    );
    expect(legal).toHaveLength(2);
  });
});

describe('playCard()', () => {
  test('enforces turn order', () => {
    const state = buildPlayingState(
      { a: [c(Suit.Hearts, Rank.Seven)], b: [c(Suit.Hearts, Rank.Eight)] },
      TRUMP,
    );
    expect(() => MuushigEngine.playCard(state, 'b', c(Suit.Hearts, Rank.Eight))).toThrow();
  });

  test('rejects a card the player does not hold', () => {
    const state = buildPlayingState(
      { a: [c(Suit.Hearts, Rank.Seven)], b: [c(Suit.Clubs, Rank.Nine)] },
      TRUMP,
    );
    expect(() => MuushigEngine.playCard(state, 'a', c(Suit.Spades, Rank.Ace))).toThrow();
  });

  test('rejects an illegal move when the player can beat but does not', () => {
    const state = buildPlayingState(
      {
        a: [c(Suit.Hearts, Rank.Seven)],
        b: [c(Suit.Hearts, Rank.Eight), c(Suit.Diamonds, Rank.Ace)],
      },
      TRUMP,
    );
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.Seven));
    expect(() => MuushigEngine.playCard(state, 'b', c(Suit.Diamonds, Rank.Ace))).toThrow();
  });

  test('sets the led suit, removes the card from hand, and advances the turn', () => {
    const state = buildPlayingState(
      { a: [c(Suit.Hearts, Rank.Seven)], b: [c(Suit.Hearts, Rank.Eight)] },
      TRUMP,
    );
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.Seven));
    expect(state.ledSuit).toBe(Suit.Hearts);
    expect(state.players.get('a')!.hand).toHaveLength(0);
    expect(state.currentTurn).toBe('b');
    expect(MuushigEngine.isTrickComplete(state)).toBe(false);
  });
});

describe('resolveTrick()', () => {
  test('highest card of the led suit wins when no trump is played', () => {
    const state = buildPlayingState(
      {
        a: [c(Suit.Hearts, Rank.Seven)],
        b: [c(Suit.Hearts, Rank.King)],
        c: [c(Suit.Diamonds, Rank.Nine)],
      },
      TRUMP,
    );
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.Seven));
    MuushigEngine.playCard(state, 'b', c(Suit.Hearts, Rank.King));
    MuushigEngine.playCard(state, 'c', c(Suit.Diamonds, Rank.Nine));
    expect(MuushigEngine.isTrickComplete(state)).toBe(true);

    const result = MuushigEngine.resolveTrick(state);
    expect(result.winnerId).toBe('b');
    expect(state.players.get('b')!.tricksWon).toBe(1);
    expect(state.leaderId).toBe('b');
    expect(state.currentTurn).toBe('b');
    expect(state.currentTrick).toHaveLength(0);
    expect(state.ledSuit).toBe('');
    expect(state.tricksPlayed).toBe(1);
  });

  test('a trump wins over the highest led-suit card', () => {
    const state = buildPlayingState(
      {
        a: [c(Suit.Hearts, Rank.Ace)],
        b: [c(Suit.Spades, Rank.Seven)],
        c: [c(Suit.Hearts, Rank.Ten)],
      },
      TRUMP,
    );
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.Ace));
    MuushigEngine.playCard(state, 'b', c(Suit.Spades, Rank.Seven)); // trumps in
    MuushigEngine.playCard(state, 'c', c(Suit.Hearts, Rank.Ten));

    const result = MuushigEngine.resolveTrick(state);
    expect(result.winnerId).toBe('b');
    expect(result.winningCard.key).toBe('Spades:7');
  });
});

describe('Dying Ace rule', () => {
  test('does not die if leader plays the Ace of trumps on fresh turn', () => {
    const state = buildPlayingState(
      {
        a: [c(Suit.Spades, Rank.Ace)], // Trump Ace (Spades is TRUMP)
        b: [c(Suit.Hearts, Rank.Seven)],
      },
      TRUMP,
    );
    expect(state.players.get('a')!.trumpAceDead).toBe(false);
    MuushigEngine.playCard(state, 'a', c(Suit.Spades, Rank.Ace));
    expect(state.players.get('a')!.trumpAceDead).toBe(false);
  });

  test('dies if leader holds the Ace of trumps but opens with a different card', () => {
    const state = buildPlayingState(
      {
        a: [c(Suit.Spades, Rank.Ace), c(Suit.Hearts, Rank.Eight)],
        b: [c(Suit.Hearts, Rank.Seven)],
      },
      TRUMP,
    );
    expect(state.players.get('a')!.trumpAceDead).toBe(false);
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.Eight));
    expect(state.players.get('a')!.trumpAceDead).toBe(true);
  });

  test('a dead Ace is beaten by a lower trump card', () => {
    const state = buildPlayingState(
      {
        a: [c(Suit.Spades, Rank.Ace), c(Suit.Hearts, Rank.Eight)],
        b: [c(Suit.Hearts, Rank.Seven), c(Suit.Spades, Rank.Seven)],
      },
      TRUMP,
    );
    // Player a leads Hearts:8, holding Spades:Ace -> Spades:Ace dies!
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.Eight));
    MuushigEngine.playCard(state, 'b', c(Suit.Hearts, Rank.Seven));

    // Resolve trick 1
    MuushigEngine.resolveTrick(state);

    // Trick 2: Player a leads the dead Spades:Ace. Player b plays Spades:7
    MuushigEngine.playCard(state, 'a', c(Suit.Spades, Rank.Ace));
    MuushigEngine.playCard(state, 'b', c(Suit.Spades, Rank.Seven));

    const result = MuushigEngine.resolveTrick(state);
    expect(result.winnerId).toBe('b'); // The 7 of Spades (trump) beats the dead Ace of Spades!
  });

  test('a dead Ace led is beaten by a card of the led suit', () => {
    const state = buildPlayingState(
      {
        a: [c(Suit.Spades, Rank.Ace), c(Suit.Hearts, Rank.Eight)],
        b: [c(Suit.Hearts, Rank.Seven), c(Suit.Spades, Rank.Ten)],
      },
      TRUMP,
    );
    // Player a leads Hearts:8, holding Spades:Ace -> Spades:Ace dies!
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.Eight));
    MuushigEngine.playCard(state, 'b', c(Suit.Hearts, Rank.Seven));
    MuushigEngine.resolveTrick(state);

    // Trick 2: Player a leads the dead Spades:Ace. Player b plays Spades:10 (following suit)
    MuushigEngine.playCard(state, 'a', c(Suit.Spades, Rank.Ace));
    MuushigEngine.playCard(state, 'b', c(Suit.Spades, Rank.Ten));

    const result = MuushigEngine.resolveTrick(state);
    expect(result.winnerId).toBe('b'); // The 10 of Spades beats the dead Ace of Spades!
  });

  test('a dead Ace led wins if everyone else plays off-suit cards', () => {
    const state = buildPlayingState(
      {
        a: [c(Suit.Spades, Rank.Ace), c(Suit.Hearts, Rank.Eight)],
        b: [c(Suit.Hearts, Rank.Seven), c(Suit.Diamonds, Rank.Ten)], // b has no Spades
      },
      TRUMP,
    );
    // Player a leads Hearts:8, holding Spades:Ace -> Spades:Ace dies!
    MuushigEngine.playCard(state, 'a', c(Suit.Hearts, Rank.Eight));
    MuushigEngine.playCard(state, 'b', c(Suit.Hearts, Rank.Seven));
    MuushigEngine.resolveTrick(state);

    // Trick 2: Player a leads the dead Spades:Ace. Player b plays Diamonds:10 (sloughs off-suit)
    MuushigEngine.playCard(state, 'a', c(Suit.Spades, Rank.Ace));
    MuushigEngine.playCard(state, 'b', c(Suit.Diamonds, Rank.Ten));

    const result = MuushigEngine.resolveTrick(state);
    expect(result.winnerId).toBe('a'); // Dead Ace led still wins if everyone plays off-suit cards
  });
});
