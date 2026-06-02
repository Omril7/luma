# 04 — API Contract (REST)

Base path: `/api`. JSON in/out. All request bodies validated with Zod schemas from
`src/shared/schemas/` (same schemas the client uses). Admin routes require a JWT.

## Conventions

- **Success envelope:** return the resource/array directly with appropriate status
  (`200`, `201`). Lists may return `{ data, total, page, pageSize }` when paginated.
- **Error envelope:**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { } } }
  ```
  Codes: `VALIDATION_ERROR` (400/422), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
  `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL` (500).
- **Auth:** admin routes expect `Authorization: Bearer <jwt>`. See `08-admin-panel.md`.
- **Rate limiting:** public write endpoints (orders, contact, newsletter, apply-coupon,
  calculate-price) are rate-limited per IP. See `10-devops.md`.
- **Bilingual:** responses include both `_he` and `_en` fields; the client picks per language.
- **Money:** transported as Decimal strings in ₪ (e.g. `"1299.00"`); the engine works in agorot
  internally (see `03-pricing-engine.md`).

## Public endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/products` | List products. Query: `category`, `featured`, `active`, `sort` (`price`/`newest`/`name`), `page`, `pageSize`. |
| GET | `/api/products/:slug` | Single product with variants, colors, images, pricing rule. |
| POST | `/api/products/:id/calculate-price` | Server-validated price for a variant or custom dimensions. Body: `{ variantId?, custom?, colorId?, quantity? }` → `{ unitPrice, totalPrice, baseTierId, surchargeBreakdown }`. |
| GET | `/api/categories` | List active categories (enum + counts). |
| POST | `/api/orders` | Create an order. Body validated; server recomputes all line prices and totals. Returns the created order (with `id`, `orderNumber`). |
| GET | `/api/orders/:id` | Order details for the confirmation page. |
| POST | `/api/orders/:id/apply-coupon` | Validate + apply a coupon. Body `{ code }`. Returns updated totals or `404/409`. |
| POST | `/api/contact` | Submit the contact form. Body `{ name, email, phone?, message, language }`. |
| POST | `/api/newsletter/subscribe` | Subscribe. Body `{ email, name?, language }`. Idempotent on email. |
| GET | `/api/gallery` | Portfolio images. |
| GET | `/api/reviews/:productId` | Approved reviews for a product. |
| GET | `/api/faq` | FAQ items (bilingual). |

### Coupon application rules
Check `isActive`, `validFrom`/`validUntil` window, `minOrderAmount`, and
`usedCount < maxUses`. Compute discount by `discountType`. Persist `usedCount` increment only
when the order is actually created/paid (not on preview).

## Admin endpoints (JWT required)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/admin/auth/login` | Email+password → JWT. |
| GET | `/api/admin/dashboard/stats` | Order count, revenue summary, recent orders. |
| POST | `/api/admin/upload` | Image upload (multipart). Returns stored URL via `StorageProvider`. |
| — | `/api/admin/products` | Full CRUD (incl. variants, pricing rule, color links, images). |
| — | `/api/admin/orders` | List/filter by status; get; update `orderStatus`/`paymentStatus`. |
| — | `/api/admin/coupons` | Full CRUD + activate/deactivate. |
| — | `/api/admin/bundles` | Full CRUD *(phase 2 UI; endpoints can land early)*. |
| — | `/api/admin/reviews` | List, approve/reject *(phase 2 UI)*. |
| — | `/api/admin/gallery` | Upload/reorder/delete portfolio images. |
| — | `/api/admin/faq` | Full CRUD. |
| — | `/api/admin/newsletter` | List subscribers, export CSV. |
| — | `/api/admin/settings` | Read/update business info, shipping costs, general config. |
| GET | `/api/admin/orders/export` | Stream a CSV of orders. Query: `from`, `to` (ISO dates), `status`. No pagination limit. |
| — | `/api/admin/site-content` | Read/update site page content blobs (home hero, about, faq, gallery intro, contact). |
| POST | `/api/webhooks/payment` | Payment processor callback (phase 2). Verifies signature, updates `paymentStatus`, triggers emails. |

> "Full CRUD" = `GET /` (list), `GET /:id`, `POST /`, `PATCH/PUT /:id`, `DELETE /:id`
> (delete = deactivate where soft-delete applies — see `02-data-models.md`).

## Route Handler pipeline

There is no Express middleware chain — the API is **Next.js Route Handlers** under
`src/app/api/**/route.ts`. Cross-cutting concerns are applied via small composable helpers
in `src/server/http/` rather than global middleware. Each handler follows this order:

```
rate limit (public writes) → parse body → zod validate (shared schema)
     → verify JWT (admin routes) → call service → shape success response
     → catch → error envelope
```

- Wrap handlers with a helper (e.g. `withApi(handler)` / `withAdmin(handler)`) that runs the
  rate-limit + auth checks and maps any thrown `AppError`/`ZodError`/`PricingError` to the error
  envelope above. This keeps individual handlers thin.
- `helmet`-style hardening (security headers), HSTS, etc. are configured in `next.config.ts`
  headers + the handler helpers, not a server middleware stack. Same-origin UI ⇒ no CORS needed
  for first-party calls; lock down any cross-origin use explicitly.
- See `05-frontend.md` for how the client surfaces these envelopes as toasts.
