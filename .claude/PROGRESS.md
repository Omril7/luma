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
