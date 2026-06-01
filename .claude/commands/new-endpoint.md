---
description: Add a REST endpoint end-to-end — route + controller + service + Zod schema + shared types — following the API contract.
argument-hint: <METHOD> <path> (e.g. POST /api/orders/:id/apply-coupon)
---

Add the endpoint **$ARGUMENTS** to the server, following `.claude/docs/04-api-contract.md`
conventions exactly (success/error envelope, auth, rate limiting, status codes).

Do all of:
1. **Shared:** add/extend the Zod schema in `shared/schemas/` for the request (and response
   type if useful). Reuse existing schemas; don't duplicate.
2. **Route:** register in `server/src/routes/` (thin). Apply auth middleware if it's an
   `/admin/*` route; apply the rate limiter if it's a public write.
3. **Controller:** `server/src/controllers/` — parse/validate via the shared schema, call the
   service, shape the response per the contract.
4. **Service:** `server/src/services/` — the business logic and all Prisma access. For anything
   price-related, use `pricingService` / `shared/pricing.ts` — never recompute inline.
5. **Errors:** throw typed `AppError`s so the global handler maps them to the error envelope.
6. **Tests:** add a Supertest test (happy path + validation failure + auth if applicable).

Verify: `npm -w server run typecheck` and the new test pass. Update `.claude/ROADMAP.md` if this
completes a milestone item, and append a dated entry to `.claude/PROGRESS.md`. Respect all
golden rules in `CLAUDE.md`.
