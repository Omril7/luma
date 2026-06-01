---
description: Run typecheck, lint, and tests for the app and report a concise pass/fail summary.
---

Run the project quality gates and report results concisely. Stop and surface the first failing
gate with the actionable error (don't dump full logs).

1. `npm run typecheck` (`tsc --noEmit`)
2. `npm run lint`
3. `npm run test` (the `src/shared/` pricing tests are the priority — see `.claude/docs/11-testing-quality.md`)

If a script doesn't exist yet (pre-scaffold), say so and suggest `/scaffold`.

After running, give a short table: gate · pass/fail · key issue (if any). If everything passes,
confirm the relevant acceptance gates from `11-testing-quality.md` are met for the current work.

$ARGUMENTS
