# PROGRESS LOG — Eden Project

Chronological journal of meaningful work. **Newest entries on top.** This complements
`ROADMAP.md`: the roadmap holds *planned* work + checkboxes; this log records *what actually
happened, when, and any decisions/caveats*. When you land work: append an entry here **and**
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

## 2026-06-01 — Stack decided: single-root Next.js; docs updated; scaffold pending
- **Done:** Settled the stack and rewrote the planning docs to match. **No app code committed —
  the project is intentionally docs/plan only**, ready for a clean `/scaffold` run.
  - Updated `CLAUDE.md` + all `.claude/docs/*` + `ROADMAP.md` + agents + commands (incl.
    `/scaffold`) to describe a **single Next.js (App Router) app at the repo root**: UI under
    `src/app/[lang]/`, the API as Route Handlers under `src/app/api/**`, server-only code in
    `src/server/`, and framework-free pricing/validation/types in `src/shared/`. `@/*` → `src/*`.
  - During this session I had built two exploratory scaffolds (first a Vite-SPA-shaped two-
    workspace layout, then a Next.js `web/` + `shared/` workspace split) and verified the pricing
    engine + 20 Vitest cases + `next build`. Both were **reverted to keep the tree clean** once we
    chose the simpler single-root structure. The pricing algorithm/tests will be recreated as
    `src/shared/` by `/scaffold`.
- **Roadmap:** Phase 0 (M0.1, M0.2) reset to `[ ]` — not built yet. `/scaffold` is the next action.
- **Decisions:**
  - **Stack = Next.js (App Router) + Route Handlers, ONE app at the repo root (no workspaces).**
    Chosen over a Vite SPA + separate Express API for an image-led, SEO-sensitive, Vercel-deployed
    store: server-rendered product/catalog pages (SEO), Vercel-native deploy (one project), 
    `next/image`, and built-in i18n routing. Single root (not a `web/` + `shared/` monorepo)
    because it will always be **one website** — a workspace split adds complexity with no payoff
    here; `src/shared/` stays framework-free by convention instead.
  - **i18n: next-intl** (server-component friendly) with a `[lang]` segment, replacing the
    originally-planned react-i18next.
  - *(The 2026-06-01 doc-hub entry below predates these decisions and still reflects the original
    Vite/Express plan — kept as history.)*
- **Notes/blockers:** Docker not installed on this machine — when scaffolding, the
  `docker compose up` Postgres check can't be verified locally. Tailwind, i18n wiring, Prisma, and
  the real `[lang]` UI shell are Phase-1 milestones, not Phase 0.

## 2026-06-01 — Project documentation hub + roadmap created
- **Done:** Authored the `.claude/` docs hub and planning artifacts (no app code yet):
  root `CLAUDE.md`; `.claude/docs/00–11`; `.claude/ROADMAP.md`; custom commands
  (`/scaffold`, `/new-endpoint`, `/new-feature`, `/check`); subagents (`backend-builder`,
  `frontend-builder`, `i18n-auditor`); this progress log.
- **Roadmap:** none built yet — Phase 0 is the next actionable work (`/scaffold`).
- **Decisions:** modular topic docs over few large files; docs are the single source of truth.
  Money = `Decimal` in DB, agorot in the pricing engine. Pricing + Zod live once in `shared/`.
  **Deployment target = Vercel** (serverless Express + static Vite client + managed Postgres;
  Cloudinary storage in prod since the serverless FS is ephemeral) — see `docs/10-devops.md`.
  **Stack decisions locked:** npm workspaces (no Turborepo); **Supabase Postgres** for dev
  (separate dev project) + prod, using pooled `DATABASE_URL` (`?pgbouncer=true`) + direct
  `DIRECT_URL`; **Cloudinary** for production image storage (local-disk provider in dev),
  chosen for responsive/optimized delivery on an image-led, mobile-first storefront.
- **Notes/blockers:** `.claude/settings.json` (permissions allowlist) was **not** created — the
  safety classifier blocks an agent from widening auto-allow rules; the user will add it via
  `/config` or manually if desired. Next step: run `/scaffold` for Phase 0.
