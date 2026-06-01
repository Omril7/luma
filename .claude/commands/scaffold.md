---
description: Stand up the monorepo skeleton (workspaces, configs, shared pricing engine, Prisma, Docker) per the docs.
---

You are scaffolding the Eden Project monorepo. Follow the docs as the source of truth:
`.claude/docs/01-architecture.md` (layout), `.claude/docs/10-devops.md` (scripts, env, docker),
`.claude/docs/02-data-models.md` (schema), `.claude/docs/03-pricing-engine.md` (shared engine).

Work through **Phase 0** of `.claude/ROADMAP.md` (M0.1, M0.2) and stop for review before
Phase 1 unless told otherwise.

Steps:
1. Initialize npm/pnpm **workspaces** with `client`, `server`, `shared`.
2. Create the exact folder structure from `01-architecture.md`.
3. Root config: `package.json` scripts (from `10-devops.md`), `tsconfig.base.json` (strict),
   ESLint + Prettier + lint-staged + pre-commit, `.gitignore`, `.env.example` (every var),
   `README.md`, `docker-compose.yml`.
4. Build `shared/`: `constants.ts`, `types.ts`, `pricing.ts` (implement the algorithm exactly),
   `schemas/`, and `pricing.test.ts` with the full case list from `11-testing-quality.md`.
5. Verify: `npm install` clean, `shared` pricing tests pass, `docker compose up` boots Postgres.

Rules: respect every golden rule in `CLAUDE.md`. `shared/` stays framework-free. Do not start
Phase 1 backend/frontend code in this command — that's `/new-feature` / `/new-endpoint` and the
roadmap milestones. After finishing, check off the completed roadmap items in
`.claude/ROADMAP.md` and append a dated entry to `.claude/PROGRESS.md`.

$ARGUMENTS
