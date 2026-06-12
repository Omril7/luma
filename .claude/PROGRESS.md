# PROGRESS LOG — Luma

Chronological journal of meaningful work. **Newest entries on top.** This complements
`ROADMAP.md`: the roadmap holds _planned_ work + checkboxes; this log records _what actually
happened, when, and any decisions/caveats_. When you land work: append an entry here **and**
check the matching boxes in `ROADMAP.md`.

## Entry format

```
## YYYY-MM-DD — <short title>
- **Done:** what shipped (files/areas).
- **Roadmap:** milestone(s) touched, e.g. M0.2 ✅ / M1.16 in progress.
- **Decisions:** any choices made (and why).
- **Notes/blockers:** follow-ups, risks, TODOs.
```

Keep entries short and factual. One entry per working session (or per merged change) is plenty.

---

## 2026-06-12 — Phase 0 scaffold: M0.1 + M0.2 complete

- **Done:** Full Phase 0 scaffold shipped.
  - M0.1: `package.json` (all scripts), `tsconfig.json` (strict), `next.config.ts` (with next-intl + security headers), Tailwind v3, ESLint flat config, Prettier, lint-staged + husky pre-commit, `.env.example`, `.gitignore`, `README.md`. Folder structure per `01-architecture.md` — all directories created with stub implementations.
  - M0.2: `src/shared/constants.ts`, `types.ts`, `pricing.ts` (full algorithm), `schemas/index.ts` (7 Zod schemas), `pricing.test.ts` (17 tests, all passing). Route handler `GET /api/health` imports from `@/shared` to prove wiring.
  - Bonus: Full Prisma schema (all models from `02-data-models.md`), server provider stubs (storage/email/payment), Zustand store skeletons (cart, ui, language), `useLanguageSwitch` hook, `i18n/navigation.ts` for locale-aware routing.
- **Roadmap:** M0.1 ✅ M0.2 ✅
- **Decisions:**
  - next-intl v3 locale routing: root `layout.tsx` provides `<html>/<body>` with `suppressHydrationWarning`; `[lang]/layout.tsx` is a pure provider wrapper; `LangUpdater` client component syncs `html.lang/dir` after hydration. This sidesteps the next-intl / Next.js 15 constraint that root layout must own `<html>/<body>`.
  - `NODE_ENV=development` set in the shell causes `next build` to fail with a misleading `<Html>` error. Run build with `NODE_ENV=production` (or unset). Added to `.claude/TODO.md`.
  - Full Prisma schema included in Phase 0 so `prisma generate` runs on `npm install` and types are available for future M1.x work. Seed is a stub placeholder.
- **Notes/blockers:** `db:migrate` requires Supabase credentials in `.env.local` (see TODO.md). `npm run dev` works without a DB — only API routes that query Prisma will fail until credentials are configured.

---
