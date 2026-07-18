import { describe, test, expect } from 'vitest';
import { Suit, Rank } from '../src/state/Card';
import { GameState } from '../src/state/GameState';
import { MuushigEngine, MAX_CONSECUTIVE_FOLDS } from '../src/engine/MuushigEngine';
import { MuushigBot } from '../src/engine/MuushigBot';
import { makeRng, c, buildPlayingState } from './helpers';

describe('MuushigBot — stay/fold', () => {
  function stateWithHand(cards: ReturnType<typeof c>[], trump: Suit): GameState {
    const state = buildPlayingState({ bot: cards }, trump);
    state.phase = 'decision';
    return state;
  }

  test('bids when holding a trump', () => {
    const state = stateWithHand(
      [c(Suit.Hearts, Rank.Seven), c(Suit.Spades, Rank.Eight), c(Suit.Clubs, Rank.Nine)],
      Suit.Hearts,
    );
    expect(MuushigBot.chooseStay(state, 'bot')).toBe(true);
  });

  test('folds a weak trumpless hand', () => {
    const state = stateWithHand(
      [
        c(Suit.Spades, Rank.Seven),
        c(Suit.Spades, Rank.Eight),
        c(Suit.Clubs, Rank.Nine),
        c(Suit.Clubs, Rank.Ten),
        c(Suit.Diamonds, Rank.Jack),
      ],
      Suit.Hearts,
    );
    expect(MuushigBot.chooseStay(state, 'bot')).toBe(false);
  });

  test('is forced to bid at the haranhui fold cap even with a weak hand', () => {
    const state = stateWithHand([c(Suit.Spades, Rank.Seven)], Suit.Hearts);
    state.players.get('bot')!.consecutiveFolds = MAX_CONSECUTIVE_FOLDS;
    expect(MuushigBot.chooseStay(state, 'bot')).toBe(true);
  });
});

describe('MuushigBot — swap', () => {
  test('discards low off-suit cards but never trumps or honours', () => {
    const state = buildPlayingState(
      {
        bot: [
          c(Suit.Hearts, Rank.Seven), // trump — keep
          c(Suit.Spades, Rank.Ace), // honour — keep
          c(Suit.Spades, Rank.King), // honour — keep
          c(Suit.Clubs, Rank.Seven), // discard
          c(Suit.Diamonds, Rank.Nine), // discard
        ],
      },
      Suit.Hearts,
    );
    state.phase = 'swap';
    for (let i = 0; i < 6; i++) state.stock.push(c(Suit.Clubs, Rank.Eight));

    const indices = MuushigBot.chooseSwapIndices(state, 'bot');
    expect(indices.sort()).toEqual([3, 4]);
  });

  test('never asks for more cards than the stock holds', () => {
    const state = buildPlayingState(
      {
        bot: [
          c(Suit.Clubs, Rank.Seven),
          c(Suit.Clubs, Rank.Eight),
          c(Suit.Diamonds, Rank.Nine),
          c(Suit.Diamonds, Rank.Ten),
          c(Suit.Spades, Rank.Jack),
        ],
      },
      Suit.Hearts,
    );
    state.phase = 'swap';
    state.stock.push(c(Suit.Clubs, Rank.Nine)); // stock of 1

    const indices = MuushigBot.chooseSwapIndices(state, 'bot');
    expect(indices.length).toBe(1);
    // The single discard is the worst card (the Seven of Clubs).
    expect(indices).toEqual([0]);
  });
});

describe('MuushigBot — trick play', () => {
  test('leads its highest card', () => {
    const state = buildPlayingState(
      {
        bot: [c(Suit.Spades, Rank.Seven), c(Suit.Clubs, Rank.Ace), c(Suit.Hearts, Rank.Nine)],
        other: [c(Suit.Spades, Rank.Eight)],
      },
      Suit.Diamonds,
    );
    const card = MuushigBot.chooseCard(state, 'bot')!;
    expect(card.suit).toBe(Suit.Clubs);
    expect(card.rank).toBe(Rank.Ace);
  });

  test('wins as cheaply as possible when following', () => {
    const state = buildPlayingState(
      {
        other: [c(Suit.Spades, Rank.Ten)],
        bot: [c(Suit.Spades, Rank.Jack), c(Suit.Spades, Rank.Ace), c(Suit.Spades, Rank.Seven)],
      },
      Suit.Diamonds,
    );
    MuushigEngine.playCard(state, 'other', c(Suit.Spades, Rank.Ten));
    const card = MuushigBot.chooseCard(state, 'bot')!;
    // Must beat the Ten; the Jack is the cheapest winner (not the Ace).
    expect(card.rank).toBe(Rank.Jack);
  });

  test('sloughs its lowest card when it cannot win', () => {
    const state = buildPlayingState(
      {
        other: [c(Suit.Spades, Rank.Ace)],
        bot: [c(Suit.Clubs, Rank.King), c(Suit.Clubs, Rank.Eight), c(Suit.Diamonds, Rank.Nine)],
      },
      Suit.Hearts, // no trumps in the bot's hand
    );
    MuushigEngine.playCard(state, 'other', c(Suit.Spades, Rank.Ace));
    const card = MuushigBot.chooseCard(state, 'bot')!;
    expect(card.rank).toBe(Rank.Eight);
  });

  test('always chooses a legal card across many dealt rounds', () => {
    // Property-style sweep: deal seeded rounds and step every trick with the
    // bot choosing for every seat; playCard throws on any illegal choice.
    for (let seed = 1; seed <= 25; seed++) {
      const state = new GameState();
      MuushigEngine.initializeGame(state, ['a', 'b', 'c'], makeRng(seed));
      for (const id of [...state.seatOrder]) {
        MuushigEngine.decide(state, id, true);
      }
      MuushigEngine.beginSwap(state);
      for (const id of MuushigEngine.activePlayersFrom(state, state.amankhuzuuId)) {
        MuushigEngine.swapCards(state, id, MuushigBot.chooseSwapIndices(state, id));
      }
      MuushigEngine.beginPlay(state);

      while (!MuushigEngine.isRoundComplete(state)) {
        const turn = state.currentTurn;
        const card = MuushigBot.chooseCard(state, turn);
        expect(card).not.toBeNull();
        MuushigEngine.playCard(state, turn, card!); // throws if illegal
        if (MuushigEngine.isTrickComplete(state)) MuushigEngine.resolveTrick(state);
      }
    }
  });
});

describe('MuushigBot — navshih (trump exchange)', () => {
  /** Swap-phase state where `dealer` holds `cards` and the turned trump is `trumpCard`. */
  function navshihState(cards: ReturnType<typeof c>[], trumpCard: ReturnType<typeof c>): GameState {
    const state = buildPlayingState(
      { dealer: cards, other: [c(Suit.Spades, Rank.Seven)] },
      trumpCard.suit as Suit,
    );
    state.phase = 'swap';
    state.dealerId = 'dealer';
    state.trumpExchanged = false;
    state.trumpCard.suit = trumpCard.suit;
    state.trumpCard.rank = trumpCard.rank;
    return state;
  }

  test('gives up its worst off-suit card for the trump card', () => {
    const state = navshihState(
      [
        c(Suit.Spades, Rank.Seven), // worst — index 0
        c(Suit.Clubs, Rank.King),
        c(Suit.Hearts, Rank.Ace),
      ],
      c(Suit.Hearts, Rank.Nine),
    );
    expect(MuushigBot.chooseTrumpExchange(state, 'dealer')).toBe(0);
  });

  test('upgrades a low trump when the turned card is higher', () => {
    const state = navshihState(
      [c(Suit.Hearts, Rank.Seven), c(Suit.Hearts, Rank.Eight)],
      c(Suit.Hearts, Rank.Ace),
    );
    expect(MuushigBot.chooseTrumpExchange(state, 'dealer')).toBe(0);
  });

  test('declines when every card already beats the turned trump', () => {
    const state = navshihState(
      [c(Suit.Hearts, Rank.King), c(Suit.Hearts, Rank.Ace)],
      c(Suit.Hearts, Rank.Seven),
    );
    expect(MuushigBot.chooseTrumpExchange(state, 'dealer')).toBeNull();
  });

  test('safe null when not dealer, wrong phase, or already exchanged', () => {
    const base = () => navshihState([c(Suit.Spades, Rank.Seven)], c(Suit.Hearts, Rank.Ace));

    expect(MuushigBot.chooseTrumpExchange(base(), 'other')).toBeNull();

    const wrongPhase = base();
    wrongPhase.phase = 'playing';
    expect(MuushigBot.chooseTrumpExchange(wrongPhase, 'dealer')).toBeNull();

    const spent = base();
    spent.trumpExchanged = true;
    expect(MuushigBot.chooseTrumpExchange(spent, 'dealer')).toBeNull();

    const folded = base();
    folded.players.get('dealer')!.hasResigned = true;
    expect(MuushigBot.chooseTrumpExchange(folded, 'dealer')).toBeNull();
  });

  test('a full navshih through the engine keeps the hand legal', () => {
    const state = navshihState(
      [c(Suit.Spades, Rank.Seven), c(Suit.Clubs, Rank.Eight)],
      c(Suit.Hearts, Rank.Jack),
    );
    const idx = MuushigBot.chooseTrumpExchange(state, 'dealer');
    expect(idx).not.toBeNull();
    MuushigEngine.exchangeTrump(state, 'dealer', idx!);
    expect(state.trumpExchanged).toBe(true);
    const hand = [...state.players.get('dealer')!.hand];
    expect(hand.some((card) => card.suit === Suit.Hearts && card.rank === Rank.Jack)).toBe(true);
    expect(hand).toHaveLength(2);
  });
});
