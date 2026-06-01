# 08 — Admin Panel

Routes under `/admin/*`, wrapped in `AdminLayout`, gated by JWT auth. Not customer-facing —
design can be simpler but still clean and polished. UI strings still go through i18n (admin can
run in he or en), but admin UX may default to one language.

## Auth (JWT)

- `POST /api/admin/auth/login` with email + password → signed JWT (short-lived) + optional
  refresh strategy. Passwords hashed with bcrypt/argon2 (never plaintext).
- Client stores the token (in memory + optionally `localStorage`); the API client attaches
  `Authorization: Bearer <jwt>`. A route guard redirects unauthenticated users to the login
  page.
- Server `auth` middleware verifies the JWT on every `/api/admin/*` route; invalid/expired →
  `401`. Phase 1 supports a single admin user (seeded); roles can come later.

### Designed to be upgraded (don't paint into a corner)

Phase-1 JWT auth is a secure-enough starting point, **architected so it can be hardened later
without rewriting call sites**. Keep these disciplines now so the swap stays localized:
- **All auth logic lives in one place:** the `auth` middleware + an auth service. Controllers
  never parse tokens themselves — they read `req.user` (`{ userId, role }`). Adding roles is
  then a data change, not a refactor (include a `role` claim even if it's always `"admin"`).
- **Hash passwords** with bcrypt/argon2; secrets/expiry from env only.
- The JWT verify step is the single point to change.

Future options (additive, see roadmap phase 2): refresh tokens + rotation; move the token to
an **httpOnly cookie** (kills XSS token theft); password reset/change via `EmailProvider`;
login rate-limit + lockout (reuse the existing limiter); **2FA (TOTP)**; role-based access
(owner vs staff); or delegate auth to **Supabase Auth** (we're already on Supabase) and have
the middleware merely verify Supabase-issued tokens — gaining reset/2FA/SSO largely for free.

## Pages

| Page | Route | Phase | Function |
|---|---|---|---|
| Login | `/admin/login` | 1 | Email/password. |
| Dashboard | `/admin` | 1 | Order count, revenue summary, recent orders (from `/admin/dashboard/stats`). |
| Products | `/admin/products` | 1 | Full CRUD: products, variants, pricing rule, color links, image upload, active/featured/sortOrder. |
| Orders | `/admin/orders` | 1 | List + filter by status; detail view; update `orderStatus`/`paymentStatus`. |
| Coupons | `/admin/coupons` | 1 | CRUD + activate/deactivate; usage/limits. |
| Newsletter | `/admin/newsletter` | 1 | View subscribers, export CSV. |
| Settings | `/admin/settings` | 1 | Business info, shipping costs, general config, WhatsApp number. |
| Gallery | `/admin/gallery` | 1 (basic) | Upload/reorder/delete portfolio images. |
| Bundles | `/admin/bundles` | 2 (shell now) | Manage bundles + bundle pricing. |
| Reviews | `/admin/reviews` | 2 (shell now) | Moderate (approve/reject) reviews. |

> Build the Bundles and Reviews **page shells** in phase 1 (route + empty/placeholder UI) so
> navigation is complete; wire them up in phase 2. The underlying models/endpoints already
> exist (see `02-data-models.md`, `04-api-contract.md`).

## CRUD UI pattern (reuse across resources)

- **List view:** table with search/filter, status badges, row actions (edit/deactivate),
  pagination, "New" button.
- **Edit view:** form driven by the same Zod schema as the API; inline validation; save →
  `POST`/`PATCH`; toast on success/error.
- **Bilingual inputs:** paired `_he`/`_en` fields side by side with an RTL/LTR hint.
- **Product editor specifics:** manage variants (add/remove S/M/L with dims + price), the
  single pricing rule (per-cm rates + min/max), color-option links, and the image gallery
  (upload via `/api/admin/upload`, set primary, reorder).

## Image upload

Goes through `POST /api/admin/upload` → `StorageProvider` (local now, Cloudinary later — see
`10-devops.md`). Returns a URL stored on `ProductImage.url` / gallery item. Validate type/size
server-side.

## Dashboard metrics

`GET /api/admin/dashboard/stats` returns: total orders, orders by status, revenue (paid)
summary (e.g. last 30 days), and recent orders. Keep queries efficient; cache later if needed.
