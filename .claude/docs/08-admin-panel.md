# 08 — Admin Panel

Routes under `/admin/*`, wrapped in `AdminLayout`, gated by JWT auth. Not customer-facing —
design can be simpler but still clean and polished. UI strings still go through i18n (admin can
run in he or en), but admin UX may default to one language.

> **Scope:** This admin manages the **e-commerce site** (products, content, coupons, newsletter,
> email settings). Order fulfillment is handled by the companion **luma-manager** app, which
> connects to the same Supabase database. Do not build order-management UI here.

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
  never parse tokens themselves — they read `req.user` (`{ userId, role }`).
- **Hash passwords** with bcrypt/argon2; secrets/expiry from env only.

Future options (additive, phase 2): refresh tokens + rotation; httpOnly-cookie tokens;
password reset via `EmailProvider`; login lockout; 2FA; RBAC; or delegate to Supabase Auth.

## Pages

| Page | Route | Phase | Function |
|---|---|---|---|
| Login | `/admin/login` | 1 | Email/password. |
| Products | `/admin/products` | 1 | Full CRUD: products, variants, pricing rule, color links, image upload, active/featured/sortOrder. |
| Site Content | `/admin/site-content` | 1 | Edit all static/marketing page text (home hero, About, FAQ, gallery intro, contact details) — bilingual, live immediately. |
| Email Services | `/admin/email-services` | 1 | Configure email provider settings; send test email; preview templates. |
| Coupons | `/admin/coupons` | 1 | Full CRUD with all coupon types + activate/deactivate. |
| Newsletter | `/admin/newsletter` | 1 | View subscribers, export CSV, compose & send newsletter emails. |
| Gallery | `/admin/gallery` | 1 (basic) | Upload/reorder/delete portfolio images. |
| Bundles | `/admin/bundles` | 2 (shell now) | Manage bundles + bundle pricing. |
| Reviews | `/admin/reviews` | 2 (shell now) | Moderate (approve/reject) reviews. |

> Build the Bundles and Reviews **page shells** in phase 1 (route + empty/placeholder UI) so
> navigation is complete; wire them up in phase 2.

## CRUD UI pattern (reuse across resources)

- **List view:** table with search/filter, status badges, row actions (edit/deactivate),
  pagination with per-page selector (10 / 25 / 50 rows), "New" button.
- **Edit view:** form driven by the same Zod schema as the API; inline validation; save →
  `POST`/`PATCH`; toast on success/error.
- **Preview button:** every product edit form has a "Preview on site" button that opens the
  relevant storefront page in a new tab **before** saving.
- **Bilingual inputs:** paired `_he`/`_en` fields side by side with an RTL/LTR hint.
- **Product editor specifics:** manage variants (add/remove S/M/L with dims + price), the
  single pricing rule (per-cm rates + min/max), color-option links, and the image gallery
  (upload via `/api/admin/upload`, set primary, reorder).
- **All admin tables:** pagination with per-page selector (10 / 25 / 50).

## Image upload

Goes through `POST /api/admin/upload` → `StorageProvider` → **Cloudinary**. Returns a URL
stored on `ProductImage.url` / gallery item. Validate type/size server-side.

## Coupons

Support all meaningful coupon shapes in one model (see `02-data-models.md`). The form
should let admins build any combination:

| Type (UI label) | Field combination |
|---|---|
| Permanent code | `isActive`, no `validUntil`, no `maxUses` |
| One-time global | `maxUses = 1` |
| Deadline code | `validFrom?` + `validUntil` |
| Per-customer once | `singleUsePerCustomer = true` |
| First-order only | `firstOrderOnly = true` |
| Auto-apply | `autoApply = true` (no code entry needed) |
| Percentage off | `discountType = PERCENTAGE` |
| Fixed amount off | `discountType = FIXED_AMOUNT` |
| Min purchase | `minOrderAmount` set |

These are composable — e.g. a first-order discount that also has a deadline and minimum purchase.

## Email Services page (`/admin/email-services`)

Admin-controlled email configuration. Stored in the DB as settings (or env override).

Features:
- View current email provider (`EMAIL_PROVIDER` env — stub / sendgrid / ses / smtp)
- Configure `from` address, `reply-to`, display name (bilingual)
- Send a test email to the admin's own address
- Preview order confirmation + newsletter templates (bilingual he/en)
- Note: changing the actual provider still requires an env var change + redeploy (security);
  this page configures the address/template settings that the provider uses.

## Site Content page (`/admin/site-content`)

Admin-controlled content for all storefront static/marketing pages. Stored in the DB as a
`SiteContent` table (key → bilingual JSON blob), fetched by storefront pages at request time
(no redeploy needed).

Managed sections:

| Section | Storefront page | Key fields |
|---|---|---|
| Hero | Home | Heading `_he`/`_en`, subheading, CTA label + link, background image |
| Our Story teaser | Home | Short text `_he`/`_en`, image |
| About | `/about` | Full body `_he`/`_en` (rich text / markdown), cover image |
| FAQ | `/faq` | Ordered list of Q&A pairs `_he`/`_en` (add/remove/reorder) |
| Gallery intro | `/gallery` | Heading + intro paragraph `_he`/`_en` |
| Contact details | `/contact` | Address, hours, phone, email (bilingual) |

Rules:
- All text fields bilingual (`_he` + `_en`), required for both locales.
- Images go through the existing `StorageProvider` (`POST /api/admin/upload`).
- Changes are live immediately (no publish/draft in phase 1).

## Newsletter page (`/admin/newsletter`)

Two sections:

**Subscribers tab** — paginated list of subscribers (email, name, language, subscribed date,
active status). Search by email. Export all as CSV.

**Send Newsletter tab** — compose and send a newsletter email:
- Subject `_he` / `_en`
- Body `_he` / `_en` (rich text editor)
- Target: all active subscribers, or filter by language (he only / en only / all)
- Preview before send (renders the template as the subscriber would see it)
- Send → `POST /api/admin/newsletter/send` → queues/sends via `EmailProvider`
- Shows send history (sent date, subject, recipient count)
