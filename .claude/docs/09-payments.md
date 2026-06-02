# 09 — Payments

Phase 1 **stubs** payments behind an interface so checkout is fully built and a real Israeli
processor (Meshulam / Tranzila / PayPlus) can be dropped in during phase 2 without touching
call sites.

## The interface (stub now)

`src/server/providers/payment/PaymentProvider.ts`:

```ts
export interface PaymentProvider {
  /** Begin a payment; may return a redirect URL or client token depending on processor. */
  createPayment(input: {
    orderId: string;
    amount: number;          // agorot
    currency: 'ILS';
    installments?: number;   // number of payments
    customer: { name: string; email: string; phone?: string };
    language: 'he' | 'en';
  }): Promise<{ paymentId: string; redirectUrl?: string; clientToken?: string }>;

  /** Verify/charge confirmation (e.g. webhook or polling). */
  confirmPayment(paymentId: string): Promise<{ status: 'PAID' | 'FAILED' | 'PENDING' }>;

  refundPayment(paymentId: string, amount?: number): Promise<{ status: 'REFUNDED' | 'FAILED' }>;

  /** Whether this processor supports installments and the allowed range. */
  supportsInstallments(): { supported: boolean; min?: number; max?: number };
}
```

### Phase-1 stub implementation

`StubPaymentProvider` implements the interface:
- `createPayment` returns a fake `paymentId` and no redirect; marks the order `PENDING`.
- A dev-only confirm path can flip an order to `PAID` so the confirmation flow is testable.
- `supportsInstallments()` returns a sensible default (e.g. `{ supported: true, min: 1, max: 12 }`)
  so the checkout installments UI can be exercised.

Select the provider via env (`PAYMENT_PROVIDER=stub|meshulam|tranzila|payplus`) and a small
factory, so swapping is config-only.

## Checkout integration points

- Checkout page shows a **"Pay with Credit Card"** button and an **installments** selector
  (driven by `supportsInstallments()`).
- On submit: create the order (`POST /api/orders`) → call `createPayment` →
  if `redirectUrl` is returned, **redirect the browser to the external payment page**;
  otherwise tokenize as the provider requires. The stub skips the external redirect.
- The processor receives a `successUrl` and `cancelUrl` as part of the payment initiation:
  - `successUrl` → `/[lang]/orders/[id]/confirmation?payment=success`
  - `cancelUrl`  → `/[lang]/checkout?payment=cancelled`
- On return to `successUrl`: the confirmation page calls `GET /api/orders/:id` to read the
  latest `paymentStatus` (the processor may also confirm via webhook, see below).
- `Order.paymentStatus` reflects the provider result (`PENDING/PAID/FAILED/REFUNDED`).
- Order confirmation page (`/orders/:id/confirmation`) reads the order by id and shows
  status + summary. A cancelled return shows a toast and keeps the cart intact.

### Webhooks (phase 2)

When a real processor is integrated, it POSTs payment events to
`POST /api/webhooks/payment`. The handler:
1. Verifies the request signature (provider-specific secret from env).
2. Looks up the order by `paymentId`.
3. Updates `paymentStatus` idempotently.
4. Triggers post-payment side-effects (email notifications — see `EmailProvider`).

## Israeli processors (phase 2 notes)

- **Meshulam / Tranzila / PayPlus** — hosted-page or token flows, support Israeli credit cards,
  `tashlumim` (installments), and ILS. Final choice TBD; the interface above covers the common
  surface (create → redirect/token → confirm/webhook → refund).
- Real keys/secrets go in env (`.env.example` documents placeholders); never commit secrets.
- Webhooks (when a processor is chosen) verify signatures and update `paymentStatus`
  idempotently.

## Email notifications

`src/server/providers/email/EmailProvider.ts` — same interface pattern as `PaymentProvider`:

```ts
export interface EmailProvider {
  sendOrderConfirmation(input: {
    to: string;                    // customer email
    order: OrderEmailSnapshot;     // id, items, totals, shipping
    language: 'he' | 'en';
  }): Promise<void>;

  sendNewOrderAlert(input: {
    to: string;                    // admin email (from Settings)
    order: OrderEmailSnapshot;
  }): Promise<void>;
}
```

### When emails are sent

| Trigger | Recipient | Template |
|---|---|---|
| Payment confirmed (`PAID`) | Customer | Order confirmation (order number, items, total, estimated delivery) |
| Payment confirmed (`PAID`) | Admin (from Settings) | New order alert (same info, plus customer contact) |

- Emails are fired from the webhook handler (phase 2 real provider) or from the order-confirm
  route handler (phase 1 stub: log to console / skip silently).
- `OrderEmailSnapshot` is a plain serialisable object — no Prisma models leak into the email layer.
- Select the provider via env (`EMAIL_PROVIDER=stub|sendgrid|mailchimp|ses`).
- **Phase-1 stub:** `ConsoleEmailProvider` logs the payload — no real mail sent, no setup needed.
- **Phase-2:** wire up SendGrid / AWS SES / Mailchimp Transactional behind the same interface.
  Email templates are bilingual (he/en); the `language` field drives template selection.

## Security

- Never store raw card data — always delegate to the processor's hosted page/token.
- Server recomputes order totals (see `03-pricing-engine.md`) before initiating payment.
- Validate amounts and installments server-side against the provider's reported limits.
