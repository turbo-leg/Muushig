# Contributing

## Workflow

Work is **issue-driven**:

1. Pick or open an issue describing the change.
2. Create a branch off `main`: `feat/<short-name>`, `fix/<short-name>`, or
   `chore/<short-name>`.
3. Where applicable, **write tests first** (especially for `@muushig/shared`
   engine changes), then implement until they pass.
4. Keep the change focused on a single issue.
5. Open a PR into `main`. CI (lint, typecheck, tests) must pass. Reference the
   issue with `Closes #N`.

## Local checks before pushing

```bash
npm run lint        # prettier --check
npm run typecheck   # tsc --noEmit across packages
npm test            # vitest
npm run format      # auto-fix formatting
```

A Husky pre-commit hook runs `lint-staged` (prettier) on staged files.

## Code style

- TypeScript, strict mode.
- Prettier enforces formatting (single quotes, semicolons, 100 col, 2-space).
- Engine code in `@muushig/shared` must stay **pure and deterministic** — no I/O,
  no `Date.now()`, RNG injected — so it remains unit-testable.

## Commit messages

Conventional-style prefixes are encouraged: `feat:`, `fix:`, `docs:`, `test:`,
`chore:`, `refactor:`.
