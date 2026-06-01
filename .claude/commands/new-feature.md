---
description: Build a full vertical slice of a feature — data → API → store → UI page → i18n keys — across the app.
argument-hint: <feature name> (e.g. wishlist, gift-card)
---

Implement the feature **$ARGUMENTS** as a complete vertical slice, consistent with the docs.

Plan the slice first (briefly), then build:
1. **Data** (`.claude/docs/02-data-models.md`): add/adjust Prisma models + a migration if
   needed. Include `_he`/`_en` fields for any content. Create phase-2 models now if the brief
   says so.
2. **Shared:** Zod schemas + shared types in `src/shared/`. Any pricing/calculation logic goes in
   `src/shared/` (pure, tested), never duplicated between UI and API.
3. **API** (`.claude/docs/04-api-contract.md`): endpoints via the `/new-endpoint` pattern
   (Route Handler + service + tests, correct envelope/auth/rate-limit).
4. **Client state** (`.claude/docs/05-frontend.md`): a Zustand store slice and/or
   `src/lib/api.ts` methods.
5. **UI:** Server/Client Components under `src/features/<name>/` + a route segment under
   `src/app/[lang]/` if it's a page. Mobile-first, RTL-safe (logical properties), themed via
   CSS variables.
6. **i18n** (`.claude/docs/06-i18n-rtl.md`): add keys to **both** `he.json` and `en.json`.
   No hardcoded user-facing strings.
7. **Tests** (`.claude/docs/11-testing-quality.md`): unit tests for logic, endpoint tests,
   and a component/store test where it matters.

Finish: run `/check`, ensure he+en both render and RTL is correct, then update
`.claude/ROADMAP.md` and append a dated entry to `.claude/PROGRESS.md`. Follow every golden rule
in `CLAUDE.md`.
