---
description: Stand up the single-root Next.js app skeleton (App Router, configs, src/shared pricing engine, Prisma-ready, Docker) per the docs.
---

You are scaffolding the Eden Project — a **single Next.js app at the repo root** (no
workspaces). Follow the docs as the source of truth: `.claude/docs/01-architecture.md` (layout),
`.claude/docs/10-devops.md` (scripts, env, docker), `.claude/docs/02-data-models.md` (schema),
`.claude/docs/03-pricing-engine.md` (shared engine).

Work through **Phase 0** of `.claude/ROADMAP.md` (M0.1, M0.2) and stop for review before
Phase 1 unless told otherwise.

Steps:
1. Initialize a **Next.js app at the repo root** (App Router, TypeScript, `src/` dir, `@/*` →
   `src/*` import alias). One `package.json` — no workspaces.
2. Create the exact folder structure from `01-architecture.md` (`src/app`, `src/app/api`,
   `src/components|features|hooks|stores|i18n|lib|styles|types`, `src/server/*`, `src/shared/*`,
   `prisma/`, `public/`).
3. Root config: `package.json` scripts (from `10-devops.md`), `tsconfig.json` (strict),
   `next.config.ts`, ESLint + Prettier + lint-staged + pre-commit, `.gitignore` (Next-aware),
   `.env.example` (every var), `README.md`, `docker-compose.yml`.
4. Build `src/shared/`: `constants.ts`, `types.ts`, `pricing.ts` (implement the algorithm
   exactly), `schemas/`, and `pricing.test.ts` with the full case list from
   `11-testing-quality.md`. Add a minimal `src/app/layout.tsx`, `page.tsx`, and
   `src/app/api/health/route.ts` that imports from `@/shared` (proves wiring).
5. Verify: `npm install` clean, pricing tests pass (Vitest), `npm run typecheck` + `npm run lint`
   clean, `next build` succeeds. (`docker compose up` boots Postgres — note if Docker is
   unavailable locally.)

Rules: respect every golden rule in `CLAUDE.md`. `src/shared/` stays **framework-free** (no
React/Next/Prisma imports). Do not start Phase 1 backend/frontend features in this command —
that's `/new-feature` / `/new-endpoint` and the roadmap milestones. After finishing, check off
the completed roadmap items in `.claude/ROADMAP.md` and append a dated entry to
`.claude/PROGRESS.md`.

$ARGUMENTS
