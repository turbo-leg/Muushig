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

1. Each player is dealt **5 cards**, one at a time.
2. The next card is flipped **face-up**; its suit is the **trump suit** (beats
   all other suits) for the round.
3. Exactly **6 cards** form the face-down **stock** (the _tal_). Any remaining
   undealt cards are **set aside** (out of play for the round).
4. Every player starts the game at **15 points**.

## Strategy phase — stay or resign

Before any card is played, each player decides whether to **stay** or **resign**
(in clockwise order from the dealer's left):

- **Resign:** you sit the round out. Your score is **unchanged** — this protects
  a weak hand from the shut-out penalty, but forfeits the chance to score.
- **Stay → the draw:** a one-time option to discard any number of your cards (up
  to all 5) and draw replacements from the 6-card stock. If the stock runs out,
  the remaining players play with what they have. (The face-up trump card is not
  part of the stock and cannot be drawn.)

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
  chooses to stay or resign, then a **swap** phase where the stayers draw.
- Seat order is fixed for now; `seatOrder[0]` leads the opening trick (treated as
  the player to the dealer's left). Rotating the dealer between games is a
  possible future refinement.
- The engine is pure and deterministic (injectable RNG); the Colyseus server is
  authoritative and the client mirrors only the legal-move rule for UI hinting.
