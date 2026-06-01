# 11 — Testing & Quality

Quality gates that keep the evolving codebase safe to change.

## Test strategy (by layer)

| Layer | Tool | What to cover |
|---|---|---|
| `shared/pricing.ts` | **Vitest** | **Highest priority.** All algorithm branches — see below. |
| `shared/schemas/` | Vitest | Zod schemas accept valid / reject invalid payloads. |
| Server services/controllers | Vitest + **Supertest** | Endpoint behavior, auth guards, error envelope, coupon rules, price re-validation. |
| Client units | Vitest + Testing Library | Stores (cart math), the price-preview hook, key components. |
| End-to-end | **Playwright** | Smoke: browse → product → custom price → add to cart → checkout (stub) → confirmation. RTL + language switch. |

## Pricing engine tests (mandatory)

In `shared/` (e.g. `shared/pricing.test.ts`). Must cover:
- Exact standard-variant match returns the variant price.
- Custom dimensions within one tier → base + correct surcharge.
- Custom dimensions between tiers → correct "closest-but-smaller" base selection.
- Custom below the smallest tier → smallest variant as base, no negative surcharge.
- Out-of-range dimension → throws `PricingError` naming the dimension/bound.
- Missing per-cm rate on an axis → that axis adds 0.
- Multi-axis surcharge sums correctly.
- Rounding to whole agorot happens once at the end.
- Quantity multiplies the unit price.
- **Parity:** the same inputs yield the same output the server uses (guards client/server drift).

## Lint & format

- ESLint (TS + React + import rules) and Prettier. Run via `npm run lint`.
- Enforce the golden rules where lint can: no physical-direction CSS classes (custom rule or
  review), no hardcoded user-facing strings in JSX (encourage via `i18n-auditor` agent).
- Pre-commit: `lint-staged` runs Prettier + ESLint on staged files.

## CI (optional but recommended)

A GitHub Actions workflow (when a remote exists) running on PRs:
`install → typecheck → lint → test (shared/server/client) → build`. Add Playwright smoke as a
separate job. Block merge on failure.

## Acceptance gates per feature

- Typechecks and lints clean.
- Relevant unit tests added/updated and passing.
- Bilingual: he + en both render; no missing i18n keys (`i18n-auditor`).
- RTL: layout correct in Hebrew (logical properties only).
- Mobile: looks right at small breakpoints first.
- Accessibility: keyboard-reachable, labelled, sufficient contrast; a11y widget works.
- For pricing-touching changes: pricing tests still green and client/server agree.

## Performance checks

- Route-level code splitting; images lazy-loaded; reasonable bundle size.
- Lighthouse pass on Home + Product pages before launch (perf + a11y + SEO).
