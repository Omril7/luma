# 09 — Payments & Email

> **Status: planning only.** This section documents the Morning payment integration and the
> admin Orders page as a design to implement — **no code has been written yet**. Luma is live in
> production; Prisma schema changes described here are additive and safe to apply, but the user
> decides when migrations actually run. Do not run `db:migrate` for this work without explicit
> go-ahead.

---

## Payment — Morning (Green Invoice)

Provider: **Morning** (formerly Green Invoice), the same processor already integrated in the
sibling project `lights-and-vessels` (`C:\Users\omril\Projects\lights-and-vessels`). This plan
mirrors that implementation closely — same API client shape, same webhook quirks, same
sandbox→production cutover mechanism — since it's a proven, working integration against the
same processor.

Morning's model: one API call (`POST /payments/form`) both **charges the card and issues the tax
document** (receipt/invoice) — there's no separate "charge" then "invoice" step. The response is
a hosted checkout URL (`sandbox.meshulam.co.il/credit-checkout/...` in sandbox); the customer is
redirected there, enters card details, and Morning calls back via `successUrl` / `failureUrl`
(browser redirect) and `notifyUrl` (server-to-server IPN — the source of truth).

### Business config (confirmed)

- Luma is **עוסק פטור** (VAT-exempt dealer) — same as lights-and-vessels. No VAT line on
  documents; `vatType: 2` (`VAT_TYPE_EXEMPT`) on every income row.
- Document type: **RECEIPT (400)** by default — matches lights-and-vessels. (If this ever
  changes to `עוסק מורשה`, it's a one-line env/const change to `TAX_INVOICE_RECEIPT (320)` +
  `vatType`, not a redesign.)
- **Installments**: pass through to Morning. Checkout already collects `installments` (1/3/6/12,
  stored on `Order.installments`) — include it in the `/payments/form` payload once confirmed
  which field Morning's grow terminal expects (`maxPayments` per Morning's docs; verify against
  the sandbox terminal's supported range during implementation — grow terminals can cap max
  installments per merchant agreement).

### Env vars

| Var                        | Sandbox (now)                                           | Production (later)                          |
| -------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| `MORNING_API_BASE`         | `https://sandbox.d.greeninvoice.co.il/api/v1`           | `https://api.greeninvoice.co.il/api/v1`     |
| `MORNING_API_KEY_ID`       | sandbox key id                                          | production key id                           |
| `MORNING_API_SECRET`       | sandbox secret                                          | production secret                           |
| `MORNING_PLUGIN_ID`        | sandbox grow terminal `id` (**not** `externalKey\*\*)   | production terminal id                      |
| `MORNING_DEFAULT_DOC_TYPE` | `400`                                                   | `400` (or `320` if VAT status ever changes) |
| `MORNING_WEBHOOK_SECRET`   | shared HMAC secret (if/when Morning signs IPNs)         | same, per environment                       |
| `PAYMENT_PROVIDER`         | `morning` (or `stub` for local dev without credentials) | `morning`                                   |

**Going live is a base-URL + credential swap only** — no code change. This is why the client
must never hardcode the sandbox host (see `src/server/providers/payment/morning.ts` below).

The API key itself will be supplied later; until then this integration should be built and
tested against `PAYMENT_PROVIDER=stub` (no real HTTP calls) and, once a sandbox key exists,
against `PAYMENT_PROVIDER=morning` with `MORNING_API_BASE` pointed at the sandbox host.

### Prerequisites (from lights-and-vessels' hard-won notes — apply here too)

1. An active clearing terminal must be connected in Morning's dashboard
   (`/market/digital-payments` → grow) before `/payments/form` will succeed — otherwise
   `errorCode 2600`.
2. `MORNING_PLUGIN_ID` is the terminal's `id` from `GET /plugins`, **not** its `externalKey`.
3. The request to `/payments/form` needs a **top-level `amount`** (sum of income rows) —
   omitting it fails with `errorCode 2417` ("invalid document amount").
4. Callback URLs (`successUrl`/`failureUrl`/`notifyUrl`) **must be `https`** — Morning's WAF
   403s any `http://localhost` callback. Local dev testing of the full redirect round-trip
   requires a tunnel (ngrok) or testing against a deployed preview URL.
5. The sandbox test card: `4580 4580 4580 4580`, CVV `666`, any future expiry, ID `458045804`.

### Architecture: where this plugs into Luma

Luma already has a `PaymentProvider` abstraction (`src/server/providers/payment/index.ts`) with
a `StubPaymentProvider`, but it's speculative dead code — nothing calls it yet (`createOrder` in
`orderService.ts` never invokes it), and its shape (`createPayment(intent)` /
`verifyWebhook(body, signature)`, `amount` in **agorot**) doesn't match how Morning actually
works (hosted payment-form URL, amounts in **₪** — `Order.total` is already a `Decimal` in ₪, not
agorot, per golden rule #7). **This interface needs to be replaced**, not extended, to reflect
what a hosted-checkout-with-embedded-invoicing processor actually needs:

```
src/server/providers/payment/
  index.ts     — PaymentProvider interface + getPaymentProvider() factory (reads PAYMENT_PROVIDER env)
  morning.ts   — MorningPaymentProvider: real client, mirrors lights-and-vessels' src/lib/morning.ts
  stub.ts      — StubPaymentProvider: fake form URL, no HTTP calls — local dev / CI
```

```ts
// src/server/providers/payment/index.ts
export interface PaymentIncomeRow {
  description: string
  quantity: number
  price: number // ₪, matches Order/OrderItem decimal convention — NOT agorot
  itemId?: string
}

export interface CreatePaymentFormInput {
  orderId: string
  orderNumber: string
  description: string
  income: PaymentIncomeRow[]
  amount: number // ₪, sum of income rows — sent explicitly (Morning requires top-level amount)
  installments?: number
  customer: { name: string; email: string; phone?: string; address?: string }
  language: 'he' | 'en'
  successUrl: string
  failureUrl: string
  notifyUrl: string
}

export interface PaymentFormResult {
  id: string
  url: string
}

export interface CreateCreditNoteInput {
  originalDocumentId: string
  amount: number // ₪, positive
  description: string
  income: PaymentIncomeRow[]
  customer: { name: string; email: string; phone?: string }
  sendByEmail?: boolean
}

export interface CreditNoteResult {
  id: string
  number?: string
  url?: string | null
}

export interface PaymentProvider {
  createPaymentForm(input: CreatePaymentFormInput): Promise<PaymentFormResult>
  getDocumentPreviewUrl(documentId: string): Promise<string | null>
  createCreditNote(input: CreateCreditNoteInput): Promise<CreditNoteResult>
  resendDocumentByEmail(documentId: string, email: string): Promise<void>
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean
}

export async function getPaymentProvider(): Promise<PaymentProvider> {
  const kind = process.env.PAYMENT_PROVIDER ?? 'stub'
  if (kind === 'morning') {
    const { MorningPaymentProvider } = await import('./morning')
    return new MorningPaymentProvider()
  }
  const { StubPaymentProvider } = await import('./stub')
  return new StubPaymentProvider()
}
```

`morning.ts` ports `lights-and-vessels/src/lib/morning.ts` almost as-is: JWT token exchange
(`POST /account/token`, cached ~25 min, refreshed on 401), `createPaymentForm`, `getDocument` /
`getDocumentPreviewUrl`, `createCreditNote`, `resendDocumentByEmail`, and
`verifyWebhookSignature` (HMAC-SHA256 over the raw body, timing-safe compare). All values read
from `process.env.MORNING_*` at call time (never hardcode sandbox vs. prod).

### Checkout flow (replaces the current stub-only flow)

Today, `POST /api/orders` creates the `Order` row and the frontend goes straight to the
confirmation page — no payment actually happens. New flow:

1. `POST /api/orders` (existing `orderService.createOrder`) — unchanged: validates + prices
   items server-side, persists the `Order` (+ `OrderItem`s) as `paymentStatus: PENDING`.
2. Immediately after persisting, call `getPaymentProvider().createPaymentForm(...)` with income
   rows built from the priced `OrderItem`s + shipping cost, `custom: order.id` (Morning echoes
   this back on the IPN — it's how we correlate the callback to our order; **it must be
   unguessable**, and `cuid()` order ids already are), and:
   - `successUrl` → `{origin}/[lang]/checkout/success?orderId={order.id}`
   - `failureUrl` → `{origin}/[lang]/checkout/failed?orderId={order.id}`
   - `notifyUrl` → `{origin}/api/webhooks/morning`
3. Persist `morningPaymentFormId` / `morningPaymentFormUrl` on the order, return
   `{ orderId, redirectUrl }` to the client.
4. Client (`CheckoutClient.tsx`) redirects the browser to `redirectUrl` (Morning's hosted page)
   instead of routing straight to the confirmation page as it does today.
5. **On success/failure return** (`successUrl`/`failureUrl`), these are just the browser
   redirect — **not proof of payment**. The success page should show a "processing" state and
   poll/refetch order status, or simply defer to the IPN as the source of truth (matches
   lights-and-vessels: `/checkout/success` shows a generic thank-you and the _real_ state comes
   from the webhook, which usually beats the redirect back).
6. **Retry**: if a customer lands on the failure page (or abandons and comes back), don't create
   a duplicate order — regenerate a fresh payment form for the _same_ pending order
   (`POST /api/checkout/retry { orderId }`, mirroring `RetryPaymentButton.tsx` +
   `checkout/retry/route.ts`).

### Webhook — `POST /api/webhooks/morning`

This is the most fragile part of the integration and lights-and-vessels' implementation encodes
several confirmed-from-production quirks worth carrying over verbatim:

- **The IPN body is `application/x-www-form-urlencoded`, snake_case**, not JSON (a JSON
  fallback should still be accepted defensively). Confirmed fields: `id`, `external_data` (our
  echoed `custom` = `order.id`), `document_id`, `number`, `type`, `transaction_id`,
  `url` / `original_doc_url` / `copy_doc_url`.
- **The IPN arrives unsigned** in practice (no `x-morning-signature` header observed), so HMAC
  verification must only be _enforced_ when a signature header is actually present — a
  configured `MORNING_WEBHOOK_SECRET` must not block genuine unsigned callbacks. Because of this,
  authenticity effectively rests on the echoed `external_data` being an unguessable id
  (`cuid()` — fine) plus, ideally, a follow-up `GET /documents/:id` re-check before trusting
  the callback fully (documented as a pre-go-live hardening step in the reference repo; worth
  doing here too before flipping to production).
- **No explicit "success" field** — success is inferred from a present `document_id` (and
  absence of an explicit failure/declined status string).
- **Idempotency required**: Morning may retry the IPN. Check whether the order is already
  `paymentStatus: PAID` before reprocessing (no duplicate emails / no duplicate
  `MorningDocument` rows — use `upsert` keyed on the Morning document id).
- **Unknown order → still return 200** (`{ ok: true }`), or Morning will retry indefinitely for
  an id it can't resolve.
- On success: update `Order.paymentStatus = PAID`, `paidAt`, `morningTransactionId`,
  `morningDocumentId`, `morningDocumentNumber`, `morningDocumentUrl` (fetched via
  `getDocumentPreviewUrl` if the IPN didn't include one); upsert a `MorningDocument` row (see
  schema below); **then** trigger the order-confirmation + admin-new-order emails (this is the
  correct trigger point — matches what `.claude/docs/09-payments.md`'s Email section already
  specifies: "Payment confirmed (PAID)").
- On failure/decline: leave `paymentStatus: PENDING` (not `FAILED` — Morning's IPN doesn't
  clearly distinguish "still pending" from "actively declined"; `FAILED` is reserved for cases
  we can positively identify, e.g. an explicit declined status string) so the customer can retry
  from the failure page without admin intervention.

### Admin refunds — credit notes

Refunding in Morning = issuing a **credit note** linked to the original document
(`POST /documents` with `type: CREDIT_NOTE (330)`, `linkedDocumentIds: [originalDocumentId]`).
There's no separate "refund the charge" API call in this integration (matches
lights-and-vessels — the credit note is the refund instrument for bookkeeping/VAT purposes; it
does **not** itself reverse the card charge via the processor, which is a manual step in
Morning's dashboard if an actual money-back transfer is needed — **confirm this expectation
with the user before implementing**, since "issue a credit note" and "return the customer's
money" are two different actions that are easy to conflate).

- **Full refund**: mirror every `OrderItem` + shipping as credit-note income lines. Sets
  `Order.paymentStatus = REFUNDED`.
- **Partial refund**: single summary income line for the partial amount. Sets
  `Order.paymentStatus = PARTIALLY_REFUNDED` (new enum value — see schema below).
- Requires `Order.morningDocumentId` to exist (can't credit-note an order with no issued
  document — i.e., one that was never actually paid).
- `sendByEmail: true` so Morning emails the credit note to the customer directly.

### Resend document

`POST /documents/:id/distribute { emails: [email] }` — trivial passthrough, used when a
customer says they never got their receipt email.

---

## Prisma schema changes (planned — not applied)

All additive; nothing here removes or renames existing columns, so it's safe for a live DB
whenever the migration is actually run. `luma-manager` only reads `Order`/`OrderItem`/`Product`
for its own webhook-driven income entries (`src/app/api/webhooks/store/route.ts`) — it doesn't
depend on these new columns, so this doesn't require any coordinated change there.

```prisma
enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED   // new
}

model Order {
  // ...existing fields unchanged...

  paidAt                 DateTime?
  morningPaymentFormId   String?
  morningPaymentFormUrl  String?
  morningTransactionId   String?
  morningDocumentId      String?
  morningDocumentNumber  String?
  morningDocumentUrl     String?

  documents MorningDocument[]   // new relation
}

// New model — full audit trail of every document issued for an order
// (original receipt/invoice + any credit notes). Order's flat morning* fields
// above are a "current state" convenience mirror of the latest primary document;
// this table is the source of truth for refund history.
model MorningDocument {
  id         String   @id @default(cuid())
  morningId  String   @unique
  type       Int      // 400 = RECEIPT, 330 = CREDIT_NOTE (see DOC_TYPE in morning.ts)
  number     String
  amount     Decimal  @db.Decimal(10, 2)  // negative for credit notes
  currency   String   @default("ILS")
  status     String   @default("issued")
  url        String?
  issuedAt   DateTime
  rawPayload String?  // raw IPN body or API response, for debugging
  createdAt  DateTime @default(now())

  order      Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  orderId    String?
}
```

Naming intentionally mirrors the `morning*` field names already used in lights-and-vessels (and
coincidentally in `luma-manager`'s unrelated `MorningDocument` model) for consistency across the
codebases the user works in.

---

## Order Management — Admin (`/admin/orders`)

Replaces the current `ADMIN_NAV_ITEMS` entry in `src/features/admin/adminNav.ts` that links out
to `https://luma-manager.vercel.app/orders` (`external: true, comingSoon: true`) — that URL isn't
actually an orders page (luma-manager is a bookkeeping app: income/expenses/VAT/pricing, no
order management UI exists there). This becomes a real in-app admin section:

```ts
{
  href: '/admin/orders',
  icon: ShoppingBag,
  label: 'הזמנות',
  desc: 'צפייה וטיפול בהזמנות הלקוחות, סטטוס תשלום וזיכויים',
}
```

### Pages / routes

| Route                | Purpose                                                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/orders`      | List view: table with search (order #, customer name/email), filters (`orderStatus`, `paymentStatus`, date range), pagination (10/25/50 — matches existing admin table convention) |
| `/admin/orders/[id]` | Detail view: full order (items, pricing breakdown, shipping/customer info), payment block, status control                                                                          |

### API routes

| Route                                         | Purpose                                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/orders`                       | List with filters/pagination (JWT-gated, mirrors `adminCouponService`/`adminPriceOfferService` pattern)                                                       |
| `GET /api/admin/orders/[id]`                  | Full order detail incl. `MorningDocument[]` history                                                                                                           |
| `PATCH /api/admin/orders/[id]/status`         | Update `orderStatus` (fulfillment stage: RECEIVED → IN_PRODUCTION → READY → SHIPPED → DELIVERED, or CANCELLED) — admin-driven, independent of `paymentStatus` |
| `POST /api/admin/orders/[id]/refund`          | Full or partial refund → `createCreditNote` (mirrors lights-and-vessels' `orders/[id]/refund/route.ts`: `{ amount?: number }`, omitted = full)                |
| `POST /api/admin/orders/[id]/resend-document` | Resend the invoice/receipt email                                                                                                                              |

`paymentStatus` itself is **not** manually editable from this UI in phase 1 — it's fully
webhook-driven (set by `/api/webhooks/morning`) plus the refund endpoint. A "mark as paid
manually" override (for phone/bank-transfer orders outside Morning) is a plausible phase-2
addition but out of scope here unless requested.

### Detail-page payment block (mirrors `PaymentBlock.tsx`)

- Unpaid: "טרם שולמה" + (if a payment form exists) the option to resend/regenerate the payment
  link to the customer.
- Paid: amount, `paidAt`, document number, "הורד PDF" (documentUrl), "שלח במייל מחדש"
  (resend-document), "החזר כספי" (refund — full or partial amount input) unless already
  `REFUNDED`/`CANCELLED`.
- Document history list from `MorningDocument[]` (original receipt + any credit notes, each
  with its own PDF link) — this is the audit trail the flat `Order.morningDocument*` fields
  don't capture on their own.

### Auth

Same JWT admin guard as every other `/api/admin/*` route (`src/server/auth`) — no new auth
pattern needed.

---

## Rollout plan

1. **Now (planning only)** — this document. No code changes yet.
2. **Phase A — plumbing, no live payments**: build `PaymentProvider` interface +
   `StubPaymentProvider` + `MorningPaymentProvider` (client code complete, but selected via
   `PAYMENT_PROVIDER=stub` so nothing calls the real API yet), wire checkout to actually call
   `createPaymentForm` and redirect, build the webhook route, build the admin Orders page against
   the stub provider's fake data. Prisma schema changes applied (additive — safe) whenever the
   user runs the migration.
3. **Phase B — sandbox testing**: once a Morning sandbox API key exists, set
   `PAYMENT_PROVIDER=morning` + `MORNING_API_BASE` = sandbox host + sandbox credentials in a
   preview/staging deploy (needs `https`, so local-only testing of the full redirect loop isn't
   possible — use a Vercel preview URL or ngrok). Register the sandbox webhook
   (`Developers → Webhooks` in Morning's dashboard) → `https://<preview-domain>/api/webhooks/morning`.
   Full checkout run with the sandbox test card (`4580 4580 4580 4580`).
4. **Phase C — go live**: swap `MORNING_API_BASE` to the production host + production
   credentials + production `MORNING_PLUGIN_ID` (production grow terminal). No code changes.
   Register the production webhook URL in Morning's live dashboard. Do one small real transaction
   end-to-end before announcing it's live.

## Open items to resolve during implementation (not blocking this plan)

- Confirm the exact field name Morning's `/payments/form` expects for installments
  (`maxPayments` per their docs — verify against the actual sandbox response once a key exists)
  and whether the connected grow terminal supports up to 12 installments or caps lower.
- Confirm with the user whether "refund" in the admin UI should also trigger an actual
  money-back transfer (manual, outside this integration) or is purely the bookkeeping credit
  note — affects the button copy/confirmation dialog wording.
- Decide the production webhook-signature story before go-live: if Morning's IPN is unsigned in
  production too (as observed in sandbox for lights-and-vessels), consider the
  re-verify-via-`GET /documents/:id` hardening mentioned above.

---

## Email

Emails are sent via **Nodemailer** (SMTP). The `EmailProvider` interface wraps Nodemailer so
the SMTP config can be swapped without touching call sites.

### The interface

`src/server/providers/email/EmailProvider.ts`:

```ts
export interface EmailProvider {
  sendOrderConfirmation(input: {
    to: string
    order: OrderEmailSnapshot
    language: 'he' | 'en'
  }): Promise<void>

  sendNewOrderAlert(input: {
    to: string // admin email (from Settings)
    order: OrderEmailSnapshot
  }): Promise<void>

  sendNewsletter(input: {
    subscribers: Array<{ email: string; name?: string; language: 'he' | 'en' }>
    subject_he: string
    subject_en: string
    body_he: string // HTML
    body_en: string
  }): Promise<{ sent: number; failed: number }>
}
```

`OrderEmailSnapshot` is a plain serialisable object — no Prisma models in the email layer.

### Providers

| `EMAIL_PROVIDER` | Implementation                                                                | When to use          |
| ---------------- | ----------------------------------------------------------------------------- | -------------------- |
| `stub`           | `ConsoleEmailProvider` — logs to console, no mail sent                        | Development, CI      |
| `nodemailer`     | `NodemailerEmailProvider` — sends via SMTP using the `nodemailer` npm package | Production + staging |

`NodemailerEmailProvider` reads SMTP config from env (`EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`,
`EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS`). Works with any SMTP server (Gmail, custom SMTP relay,
SendGrid SMTP bridge, AWS SES SMTP, etc.) — just set the env vars.

### When emails are sent

| Trigger                                                                             | Recipient                              | Template                                                            |
| ----------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| Payment confirmed (`PAID`) — i.e. the Morning webhook fires successfully, see above | Customer                               | Order confirmation (order number, items, total, estimated delivery) |
| Payment confirmed (`PAID`)                                                          | Admin (from Settings)                  | New order alert (same info, plus customer contact)                  |
| Admin sends newsletter                                                              | Subscriber list (filtered by language) | Newsletter template (`body_he`/`body_en`)                           |

### Email settings

Address/display config (from name, from address, reply-to) is stored in the `EmailSettings`
DB table and editable from the admin Email Services page (`/admin/email-services`). The
provider is selected via env for security.

### Phase-1 behavior

`ConsoleEmailProvider` logs the payload — no setup needed, no API keys required. Switch to
`nodemailer` by setting `EMAIL_PROVIDER=nodemailer` and the SMTP env vars.

## Security

- Never store raw card data — always delegate to Morning's hosted payment page.
- Server recomputes order totals server-side before creating the payment form (already true —
  `orderService.createOrder` re-prices every item via `calculateProductPrice`, never trusts
  client-submitted prices).
- The webhook is the source of truth for payment state, not the browser redirect
  (`successUrl`/`failureUrl` are UX only).
- Webhook idempotency: never re-send confirmation emails or re-create `MorningDocument` rows for
  an IPN retry of an already-processed order.
- `custom`/`external_data` correlation relies on `Order.id` (`cuid()`) being unguessable — never
  switch this to a sequential/guessable id.
- Admin refund/resend endpoints are JWT-gated like every other `/api/admin/*` route.
