# Muushig Design System

Visual source of truth for the Muushig client (issue #3).

- **[ART_DIRECTION.md](./ART_DIRECTION.md)** — "Tengri Nights" art direction:
  concept, color, typography, layout, the card skin, the trump-reveal moment,
  components, motion, and accessibility.
- **[tokens.css](./tokens.css)** — framework-agnostic CSS custom properties.
  Import once at the app root.
- **[tailwind.tokens.cjs](./tailwind.tokens.cjs)** — Tailwind `theme.extend`
  fragment matching the CSS tokens.

When building a specific screen, follow ART_DIRECTION.md unless a future
page-specific override doc says otherwise.
