# Muushig (Муушиг) — Rules

Muushig is a Mongolian trick-taking card game for **2–5 players**, at its best
with five. This document describes the rules as implemented by
`@muushig/shared`, and explicitly calls out the assumptions and open questions
where the source rules are ambiguous.

## Deck

A 32-card deck: ranks **7, 8, 9, 10, Jack, Queen, King, Ace** in each of the four
suits (♠ ♥ ♦ ♣). Within a suit, rank order from low to high is:

```
7 < 8 < 9 < 10 < J < Q < K < A
```

## Setup

1. Each player is dealt **5 cards**.
2. One card is turned face up — the **trump card**. Its suit is the **trump
   suit** for the round.
3. The remaining cards form the **stock**.

With 5 players the deal works out exactly: 5×5 = 25 dealt + 1 trump + 6 stock = 32. With fewer players the stock is correspondingly larger
(`stock = 32 − players×5 − 1`).

## The swap

After the deal, each player may replace **up to 5** of their cards with cards
from the stock. If the stock runs out, the remaining players keep their
originally dealt cards.

> **Assumption:** the turned-up trump card itself is _not_ part of the
> swappable stock in this implementation; only the face-down stock is drawn
> from. (Tracked as an open question — see issues.)

## Playing tricks

The first player **leads** a card. Going around in turn, each other player must,
_if able_:

- play a card of the **same (led) suit that is higher** than the current
  highest card on the table, **or**
- play a **trump**.

Only if a player has no such card may they play anything else. The player who
played the **highest card wins the trick** (trump beats led suit; led suit beats
off-suit; ties broken by rank), and leads the next trick.

The engine enforces this as: _if you hold any card that would currently beat the
winning card, you are required to play one of them._

## Scoring

- Everyone starts at **15 points**.
- The first player to reduce their score to **0 (or below)** wins.
- You **lower your score by 1 for each trick you win**.
- **Shut-out penalty:** a player who takes **zero tricks** in a round gains
  **+5 points**.
- **Resigning:** if you expect to be shut out, you may **resign before the round
  begins** to avoid the +5 penalty. A resigned player sits the round out and
  plays no cards.

> **Open question (documented in code):** the source description says resigning
> "reduces your points by the number of tricks you'd taken," which is
> contradictory for a player who resigns and therefore takes no tricks. The
> current implementation treats a resigned player as: no shut-out penalty, no
> score change. This is flagged for clarification with a native Muushig player
> before finalizing. See `MuushigEngine.scoreRound`.

## Assumptions summary

| Area            | Assumption                                                 | Status                        |
| --------------- | ---------------------------------------------------------- | ----------------------------- |
| First leader    | `seatOrder[0]` leads the first trick                       | to confirm                    |
| Swap source     | only face-down stock is swappable, not the turned-up trump | to confirm                    |
| Resign scoring  | no penalty, no reduction                                   | **needs native-player input** |
| Trick reduction | −1 per trick won                                           | to confirm                    |
