---
description: Add a REST endpoint end-to-end — Route Handler + service + Zod schema + shared types — following the API contract.
argument-hint: <METHOD> <path> (e.g. POST /api/orders/[id]/apply-coupon)
---

Add the endpoint **$ARGUMENTS** as a Next.js Route Handler, following
`.claude/docs/04-api-contract.md` conventions exactly (success/error envelope, auth, rate
limiting, status codes).

Do all of:
1. **Shared:** add/extend the Zod schema in `src/shared/schemas/` for the request (and response
   type if useful). Reuse existing schemas; don't duplicate.
2. **Route Handler:** create `src/app/api/<path>/route.ts` exporting the HTTP method
   (`GET`/`POST`/…). Keep it thin: wrap with the `withApi`/`withAdmin` helper so auth (for
   `/api/admin/*`) and the rate limiter (for public writes) are applied.
3. **Validate:** parse the body with the shared schema inside the handler; reject invalid input
   via the error envelope.
4. **Service:** put business logic and all Prisma access in `src/server/services/`. For
   anything price-related, use `pricingService` / `src/shared/pricing.ts` — never recompute inline.
5. **Errors:** throw typed `AppError`s so the wrapper maps them to the error envelope.
6. **Tests:** add a handler test (happy path + validation failure + auth if applicable).

Verify: `npm run typecheck` and the new test pass. Update `.claude/ROADMAP.md` if this
completes a milestone item, and append a dated entry to `.claude/PROGRESS.md`. Respect all
golden rules in `CLAUDE.md`.
