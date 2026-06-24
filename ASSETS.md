# Muushig — Art Asset Manifest

Everything needed to make the client look like the hand-inked tavern reference.
Each asset maps to a hook that already exists in the client, so dropping a file
in is a one-line (or zero-line) change. Put files under
`packages/client/public/assets/…` (served at `/assets/…`).

Style for everything: **hand-drawn ink + warm watercolor wash**, aged-paper feel,
consistent line weight and palette (parchment `#F5E6D3`, wood `#5C4033`, amber
`#D98E04`, ink `#3A2A1E`).

---

## 1. Must-have (this is 90% of the look)

### A. The ger interior background — 1 image

The central scene: yurt walls (khana lattice), the wood stove with fire glow,
kettle, oil lamp, folded bedding, warm light.

- **Hook:** CSS var `--tex-room` on the `.room` element.
- **File:** `/assets/room.webp`
- **Spec:** landscape **2048×1152** (16:9), WebP or JPG (no transparency needed).
  Keep the center/table area relatively uncluttered — live cards render on top.

### B. Card faces — 32 images + 1 back

Ranks **7, 8, 9, 10, J, Q, K, A** × suits **♠ ♥ ♦ ♣**. Court cards as Mongolian
figures (archer/warrior J, lady Q, khan K), pip cards with a clear rank + suit.

- **Hook:** `<PlayingCard art="…" />` (or CSS var `--card-art`). I can wire an
  auto-loader so they resolve by filename — see "Naming" below.
- **Files:** `/assets/cards/{RANK}{SUIT}.webp` →
  `7S 8S 9S 10S JS QS KS AS`, then `…H`, `…D`, `…C` (32 total), plus
  `/assets/cards/back.webp`.
- **Spec:** **500×700 px** (5:7), PNG (transparent rounded corners) or full-bleed
  parchment. Keep rank/suit legible in the **top-left corner** at small sizes.

### C. Avatar portraits — ~6–8 images

The inked character heads in each placard (old man, woman, young warrior, …).

- **Hook:** per-seat `avatarUrl` (renders into `.avatar-slot`).
- **Files:** `/assets/avatars/bot-1.webp … bot-8.webp` (+ optional
  `player-default.webp`).
- **Spec:** **256×256 px** square, PNG (transparent or parchment background).
  Note: real players get Discord avatars (round photos) — those will clash with
  the ink style, so either frame them or fall back to a default ink portrait.

---

## 2. Nice-to-have (polish — CSS placeholders already approximate these)

| Asset                                                  | Hook                                         | File                                        | Spec                                             |
| ------------------------------------------------------ | -------------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| **Title logo** "МУУШИГ" (hand-lettered)                | swap the `<TitleBanner>` text for an `<img>` | `/assets/title.webp`                        | ~1000×240, PNG transparent                       |
| **Ulzii endless-knot** ornament                        | replace `UlziiKnot` SVG                      | `/assets/knot.webp`                         | ~400×80, PNG transparent (mirror for right side) |
| **Card back pattern**                                  | `--card-back`                                | `/assets/cards/back.webp`                   | 500×700 PNG (listed above)                       |
| **Wood plank button** (with grain + nails)             | `--tex-wood-btn` (I'll add) on `.btn-wood`   | `/assets/plank.webp` + `plank-amber.webp`   | ~280×104, PNG, 9-slice-safe edges                |
| **Placard frame** (torn leather + stitching)           | background-image on `.placard`               | `/assets/placard.webp`                      | ~340×120, PNG transparent center, 9-slice        |
| **Page paper texture** (aged border behind everything) | `--tex-parchment` / body bg                  | `/assets/paper.webp`                        | 2048×2048, tileable, WebP                        |
| **Decorative hands** holding cards (L/R)               | new optional overlay imgs                    | `/assets/hand-left.webp`, `hand-right.webp` | ~700×900, PNG transparent                        |
| **Draw-pile leather slot** (empty stock)               | optional frame near center                   | `/assets/stock-slot.webp`                   | ~220×150, PNG transparent                        |

---

## 3. Naming convention (so art auto-loads)

If card files follow `{RANK}{SUIT}` with ranks `7 8 9 10 J Q K A` and suits
`S H D C` (e.g. `AS.webp`, `10H.webp`, `KC.webp`), I can wire `PlayingCard` to
resolve `art` automatically from `/assets/cards/`, so you just drop the 33 files
in and they appear — no per-card wiring.

Same for avatars: a small pool (`bot-1…bot-N`) assigned round-robin to bots.

---

## 4. Export tips

- Prefer **WebP** (backgrounds/textures) and **PNG** (cards/portraits/ornaments
  needing transparency). Export at **2×** the on-screen size for crispness.
- Keep a consistent **5:7** card ratio and a consistent margin so faces line up.
- One shared paper/ink texture across cards + placards reads as a cohesive set.

> Layout note: matching the reference _exactly_ also means the left-rail button
> column + side placards layout. The current build is responsive (buttons bottom,
> opponents top) — say the word and I'll add the fixed left-rail landscape layout
> to mirror the reference 1:1 on wide screens.
