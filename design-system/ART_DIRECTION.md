# Muushig — Art Direction: **Tengri Nights** (Eternal Blue Sky)

> The visual system for the Muushig Discord Activity. This is the source of truth
> for the `@muushig/client` UI (issue #3). Implementation tokens live in
> [`tokens.css`](./tokens.css) and [`tailwind.tokens.cjs`](./tailwind.tokens.cjs).

## 1. Concept

You are playing under the **Eternal Blue Sky** (_Münkh khökh tengri_) — the sky
the Mongols held sacred. The table is the night steppe: a deep indigo void
scattered with faint constellations, ruled by **soyombo gold**. Cards are not
glossy plastic; they are quiet **sky-lanterns** — dark glass with a thin gold
line-frame and a soft inner glow. The trump is chosen by the heavens: a soyombo
mark **ignites** to gold and the trump suit's cards warm with light.

The mood is **calm, sacred, premium, modern minimal** — closer to an
observatory or a fine watch face than a cartoon card game. Restraint is the
point: darkness, space, one gold accent, and light used sparingly to mean
something (it's your turn; this is trump; you won).

### Design principles

1. **Darkness is the canvas.** Deep indigo everywhere; light is rationed and
   always carries meaning.
2. **One metal.** Soyombo gold is the only "warm" accent. Khökh blue is the cool
   accent. Never introduce a third hue casually.
3. **Glow = state, not decoration.** A glow tells you it's interactive, active,
   trump, or victorious. If nothing is happening, nothing glows.
4. **Legibility over ornament.** Constellations and ornament sit _behind_ play
   at low contrast and never compete with cards or numbers.
5. **Stillness, then a breath of motion.** The board is calm; transitions are
   slow, soft, and few.

## 2. Color system

Dark-first; there is **one theme** (no light mode — it would break the concept).

| Token             | Hex       | Role                                                     |
| ----------------- | --------- | -------------------------------------------------------- |
| `night`           | `#0A0E27` | App background (deepest)                                 |
| `void`            | `#11183A` | Surfaces: table, panels, cards' dark glass               |
| `void-raised`     | `#19224D` | Raised surfaces: modals, menus, hovered cards            |
| `khokh`           | `#3AA0D6` | Sacred-blue accent: focus, info, secondary actions       |
| `khokh-soft`      | `#6FC0E6` | Lighter blue for hover/active on blue elements           |
| `gold`            | `#D4AF37` | Soyombo gold: primary CTA, trump, winner, key highlights |
| `gold-soft`       | `#EBCB6A` | Gold hover / glow core                                   |
| `aurora`          | `#7C5CFF` | Rare third accent — only for special moments (victory)   |
| `starlight`       | `#E8ECF8` | Primary text on dark                                     |
| `starlight-muted` | `#A9B2CE` | Secondary text, labels (meets 4.5:1 on `night`/`void`)   |
| `starlight-faint` | `#5C6790` | Disabled text, constellation lines, hairline borders     |
| `success`         | `#46C28E` | Positive (score dropped, trick won)                      |
| `danger`          | `#E5544B` | Negative (shut-out penalty, resign, error)               |

**Contrast (verified):** `starlight` on `night` ≈ 16:1, on `void` ≈ 13:1 (AAA).
`starlight-muted` on `void` ≈ 6.5:1 (AA+). `gold` on `night` ≈ 8.5:1 — fine for
large text/icons; for gold _body_ text, prefer `gold-soft`. Suit color is
**never** the only signal — always pair with the suit glyph + a text label.

### Suit treatment

Keep the four standard suits for instant readability, recolored to the night
palette (no pure red/black):

| Suit     | Glyph | Color (default) | Color (trump) |
| -------- | ----- | --------------- | ------------- |
| Spades   | ♠     | `starlight`     | `gold`        |
| Clubs    | ♣     | `starlight`     | `gold`        |
| Hearts   | ♥     | `khokh-soft`    | `gold`        |
| Diamonds | ♦     | `khokh-soft`    | `gold`        |

When a suit is trump, its glyph and frame shift toward `gold`. Reds become
**khökh blue**, not crimson, so the whole board stays within night + blue + gold.

## 3. Typography

Both faces ship full **Cyrillic** so the title renders natively: **Муушиг**.

- **Display / headings — `Cormorant Garamond`** (500/600). High-contrast,
  literary, observatory-plate elegance. Used for the logo, screen titles, the
  trump banner word, and large numerals.
- **Body / UI — `Manrope`** (400/500/600/700). Geometric humanist sans, crisp at
  small sizes in the Discord iframe. All labels, buttons, counters, hand UI.

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap');
```

**Type scale** (1.25 minor-third; rem on 16px base):

| Token      | Size            | Use                                                               |
| ---------- | --------------- | ----------------------------------------------------------------- |
| `display`  | 3.05rem         | Logo / game title (Cormorant)                                     |
| `h1`       | 2.44rem         | Screen titles (Cormorant)                                         |
| `h2`       | 1.95rem         | Section / modal titles (Cormorant)                                |
| `h3`       | 1.56rem         | Card-back word, player name emphasis (Cormorant)                  |
| `body`     | 1rem (16px min) | Default UI text (Manrope)                                         |
| `small`    | 0.8rem          | Labels, captions (Manrope 500)                                    |
| `mono-num` | tabular         | Scores/timers — Manrope with `font-variant-numeric: tabular-nums` |

Body line-height 1.6; headings 1.15. Letter-spacing +0.04em on small all-caps
labels only.

## 4. Layout

- **Container:** the play surface is a centered, slightly-elevated `void` panel
  with a 1px `starlight-faint` hairline and a soft outer shadow, floating over
  the `night` constellation background. Corner radius `--radius-lg` (20px).
- **Discord iframe:** design mobile-first (Activities run portrait on phones and
  landscape on desktop). Test at **375 / 768 / 1024 / 1440**. No horizontal
  scroll; the table scales, hand docks to the bottom safe-area.
- **Z-index scale:** background `0`, table `10`, cards `20`, active-glow `25`,
  toasts `40`, modals `50`, trump-reveal overlay `60`.
- **Spacing:** 4px base ramp (4, 8, 12, 16, 24, 32, 48, 64).

### Table anatomy

```
┌─ night sky (parallax constellations, very low contrast) ──────────────┐
│   ◦  ·   opponent seats arc across the top   ·   ◦                     │
│                                                                        │
│            ✶ trump soyombo  ·  current trick (center)                  │
│                                                                        │
│   [ · · · your hand: sky-lantern cards, fanned along bottom · · · ]    │
│   score pips ·  turn timer ring ·  swap / resign / play actions        │
└────────────────────────────────────────────────────────────────────────┘
```

## 5. The card — "sky-lantern"

> **Card faces come from a bundled SVG deck rendered via a `PlayingCard`
> component — never hand-drawn in CSS** (project convention, see
> `[[feedback_durak_cards]]`). The Tengri look is a **skin layered around** that
> SVG: the frame, back, glow, and state effects below — _not_ a reimplementation
> of the pips.

- **Frame:** dark-glass `void` fill, 1px `gold`-at-40% inner line-frame, 14px
  radius, faint inner glow (`box-shadow: inset 0 0 24px rgba(212,175,55,.08)`).
- **Back:** `void-raised` with a centered gold **soyombo** mark and a thin
  double-line border; subtle radial vignette.
- **States:**
  - _Playable_ (your turn, legal): frame brightens to `gold-soft`, gentle lift
    (`translateY(-6px)`), `cursor-pointer`.
  - _Illegal / not your turn:_ 55% opacity, desaturated, no glow, not focusable
    as a play target.
  - _Trump suit:_ frame and glyph shift to `gold`, persistent soft glow.
  - _Just played / winning the trick:_ a one-shot `khokh→gold` glow pulse.
  - _Pressed:_ `scale(0.97)` 120ms (tactile, no layout shift).

## 6. Signature moment — trump reveal

When the round's trump is turned up, a centered **soyombo** glyph **ignites**:
it scales in from 0.8, its strokes fill from `khokh` to `gold` over ~700ms, emits
a single radial glow bloom, and the matching suit's cards in hand warm to gold.
A Cormorant caption names the suit (e.g. _"Гол хөзөр — ♠"_). This is the one
deliberately theatrical animation in the game.

`prefers-reduced-motion`: skip the ignite/bloom — the soyombo simply appears in
gold and the caption fades in.

## 7. Components

- **Primary button (CTA — Ready / Start / Play):** `gold` fill, `night` text
  (≈11:1), 12px radius, 44px+ tall; hover → `gold-soft` + soft glow; focus →
  2px `khokh` ring with 2px offset; disabled → `void-raised` fill,
  `starlight-faint` text, `aria-disabled`, spinner while async.
- **Secondary button (Resign / Swap):** transparent with 1px `khokh` border,
  `khokh-soft` text; hover fills `khokh` at 12%.
- **Player seat:** avatar in a thin ring; ring turns `gold` and a turn-timer arc
  sweeps it when it's that player's turn; name in Manrope; score as a row of
  pips (15 → 0).
- **Score pips:** 15 small dots; spent points dim to `starlight-faint`. Shut-out
  +5 flashes `danger`; a trick win pulses `success`.
- **Toasts / log:** bottom-left, `void-raised`, hairline border, auto-dismiss;
  used for "trick won", "X resigned", "trump is ♠".
- **Icons:** **Lucide** SVG only, 24px viewBox, 1.5px stroke, currentColor. **No
  emoji as icons.**

## 8. Motion

| Element                  | Motion                      | Duration / easing   |
| ------------------------ | --------------------------- | ------------------- |
| Card play to center      | slide + settle              | 260ms `ease-out`    |
| Card press               | `scale(0.97)`               | 120ms               |
| Trick gather to winner   | sweep + fade                | 320ms `ease-in-out` |
| Trump ignite (signature) | scale + stroke fill + bloom | 700ms               |
| Constellation background | slow parallax drift         | 60s loop, ≤2px      |
| Glow pulses (turn/win)   | opacity breathe             | 1.4s `ease-in-out`  |

Rules: at most **1–2 animated elements per view**; `ease-out` entering,
`ease-in` exiting, never `linear`; animate only `transform`/`opacity`. **All**
ambient motion (parallax, breathing glows, ignite) is disabled under
`prefers-reduced-motion: reduce`.

## 9. Accessibility checklist

- [ ] Text contrast ≥ 4.5:1 (body) / ≥ 3:1 (large) — palette verified above.
- [ ] Suit/state never conveyed by color alone (glyph + label always present).
- [ ] Focus rings visible (2px `khokh`, 2px offset) on every interactive element.
- [ ] Touch targets ≥ 44×44px (cards in hand included).
- [ ] `prefers-reduced-motion` respected for all ambient + signature motion.
- [ ] Icon-only buttons carry `aria-label`; cards expose suit+rank to SR.
- [ ] Tab order follows visual order; modals trap focus and restore on close.
- [ ] No horizontal scroll at 375px; 16px minimum body text.

## 10. Cultural note

The **soyombo** is Mongolia's national symbol and appears on its flag; the
eternal blue sky (Tengri) is sacred in Mongolian tradition. Use them with
respect: as tasteful framing and the trump motif, not as throwaway decoration,
and avoid distorting or recoloring the soyombo arbitrarily. When in doubt, get a
native speaker's read (this also ties to the open rules question, issue #4).
