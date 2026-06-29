# Muushig (Муушиг) — Rules

Muushig is a fast-paced Mongolian trick-taking game for **2–5 players**. Unlike
most card games the goal is inverted: you start with a **penalty score of 15**
and race to bring it down to **exactly zero (or below)**. This document
describes the authoritative ruleset as implemented by `@muushig/shared`.

## Deck

A stripped **32-card** deck — ranks **7, 8, 9, 10, J, Q, K, A** in each of the
four suits (2–6 removed). Rank order, low → high:

```
7 < 8 < 9 < 10 < J < Q < K < A
```

## Setup

1. The **dealer** deals one card at a time, starting with the player to their
   **left** and going clockwise, until everyone holds **5 cards** (the dealer is
   dealt last). The player to the dealer's left is the **amankhuzuu** — they open
   the round and act first in every pre-play phase.
2. The next card is flipped **face-up**; its suit is the **trump suit** (beats
   all other suits) for the round.
3. Exactly **6 cards** form the face-down **stock** (the _tal_). Any remaining
   undealt cards are **set aside** (out of play for the round).
4. Every player starts the game at **15 points**.

### The dealer's trump exchange

In the **swap phase** — after every player has folded or played and the stayers
have drawn — the **dealer** may take the face-up trump card **into their hand**,
giving up one of their own cards in exchange (that card is set aside, out of
play). The **trump card and trump suit do not change** — the turned-up trump card
stays exactly as flipped and keeps defining the suit; the dealer's given card
never becomes the trump. This is the last action before the board is cleared and
play begins. One exchange per round.

## Strategy phase — stay or resign

Before any card is played, each player decides whether to **stay** or **resign**,
**in turn order, clockwise from the amankhuzuu** (the dealer's left):

- **Resign:** you sit the round out. Your score is **unchanged** — this protects
  a weak hand from the shut-out penalty, but forfeits the chance to score.
- **Stay → the draw:** a one-time option to discard any number of your cards (up
  to all 5) and draw the same number of replacements from the 6-card stock.
  Stayers draw **in turn order** (amankhuzuu first, then clockwise), so earlier
  seats get first pick — and the stock empties as it goes. You may draw **at most
  as many cards as remain in the stock**: asking to swap 3 when only 1 is left is
  **not allowed** (choose fewer). Once the stock is empty, remaining players play
  with what they have. (The face-up trump card is not part of the stock and
  cannot be drawn.)

## Playing tricks

The player to the dealer's left leads the first trick with any card. Going
clockwise, each player must obey this strict order:

1. **Follow suit.** If you hold the led suit, you must play it — and if you hold
   a led-suit card higher than the highest led-suit card on the table, you must
   play a higher one. You may **not** trump while holding the led suit.
2. **Trump.** If you have no card of the led suit, you must play a trump if you
   have one.
3. **Slough.** If you have neither the led suit nor a trump, play anything (it
   cannot win the trick).

The **highest trump wins**; if no trump was played, the **highest card of the
led suit wins**. The winner collects the trick and leads the next one. A round
is 5 tricks.

## Scoring

At the end of the round each player's score changes:

- **−1 point per trick won.**
- **Resigned:** score unchanged.
- **Shut-out penalty:** a player who **stayed but won zero tricks** gains
  **+5 points**.

## Winning

The first player to reduce their score from 15 down to **0 or below** wins. If
multiple players cross zero in the same round, the player with the **lowest
(most negative) score** wins — so the engine reports winners ordered best-first.

## Implementation notes

- The pre-round runs as two phases: a **decision** phase where every player
  chooses to stay or resign, then a **swap** phase where the stayers draw. Both
  advance in turn order via `state.currentTurn`, starting at the amankhuzuu.
- The **dealer rotates one seat clockwise every round** (the first round's dealer
  is the last seat in `seatOrder`, so `seatOrder[0]` opens the game). The
  `amankhuzuuId` is the seat to the dealer's left — they deal/decide/swap/lead
  first. Turn order each phase is "clockwise from the amankhuzuu", via
  `activePlayersFrom(amankhuzuuId)`. A fresh game restarts the rotation.
- The dealer's trump exchange is an out-of-turn action (`exchangeTrump`) allowed
  in the decision or swap phase; it leaves `trumpSuit` untouched and sets
  `trumpExchanged`.
- The engine is pure and deterministic (injectable RNG); the Colyseus server is
  authoritative (it gates decision/swap to the on-turn player) and the client
  mirrors the legal-move rule for UI hinting.
