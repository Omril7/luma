# 09 — Payments & Email

---

## Payment

Payment processing is **a black box** for now — the provider is TBD. The interface is
fully stubbed so checkout is built and working; a real Israeli processor can be wired in
during phase 2 without touching call sites.

### The interface

`src/server/providers/payment/PaymentProvider.ts`:

```ts
export interface PaymentProvider {
  /** Begin a payment; may return a redirect URL or client token depending on processor. */
  createPayment(input: {
    orderId: string;
    amount: number;          // agorot
    currency: 'ILS';
    installments?: number;
    customer: { name: string; email: string; phone?: string };
    language: 'he' | 'en';
  }): Promise<{ paymentId: string; redirectUrl?: string; clientToken?: string }>;

  confirmPayment(paymentId: string): Promise<{ status: 'PAID' | 'FAILED' | 'PENDING' }>;
  refundPayment(paymentId: string, amount?: number): Promise<{ status: 'REFUNDED' | 'FAILED' }>;
  supportsInstallments(): { supported: boolean; min?: number; max?: number };
}
```

**Phase-1 stub:** `StubPaymentProvider` returns a fake `paymentId`, no redirect, marks the
order `PENDING`. A dev-only confirm path flips an order to `PAID` so the confirmation flow is
testable. `supportsInstallments()` returns `{ supported: true, min: 1, max: 12 }`.

Select via env (`PAYMENT_PROVIDER=stub`; real provider name TBD).

### Checkout integration points

- Checkout → `POST /api/orders` → `createPayment` → if `redirectUrl`, redirect browser.
- Stub skips the external redirect.
- `successUrl` → `/[lang]/orders/[id]/confirmation?payment=success`
- `cancelUrl`  → `/[lang]/checkout?payment=cancelled`
- On cancel return: show toast, preserve cart.

### Webhooks (phase 2)

`POST /api/webhooks/payment` — verifies signature, updates `paymentStatus` idempotently,
triggers email notifications.

---

## Email

Emails are sent via **Nodemailer** (SMTP). The `EmailProvider` interface wraps Nodemailer so
the SMTP config can be swapped without touching call sites.

### The interface

`src/server/providers/email/EmailProvider.ts`:

```ts
export interface EmailProvider {
  sendOrderConfirmation(input: {
    to: string;
    order: OrderEmailSnapshot;
    language: 'he' | 'en';
  }): Promise<void>;

  sendNewOrderAlert(input: {
    to: string;         // admin email (from Settings)
    order: OrderEmailSnapshot;
  }): Promise<void>;

  sendNewsletter(input: {
    subscribers: Array<{ email: string; name?: string; language: 'he' | 'en' }>;
    subject_he: string;
    subject_en: string;
    body_he: string;    // HTML
    body_en: string;
  }): Promise<{ sent: number; failed: number }>;
}
```

`OrderEmailSnapshot` is a plain serialisable object — no Prisma models in the email layer.

### Providers

| `EMAIL_PROVIDER` | Implementation | When to use |
|---|---|---|
| `stub` | `ConsoleEmailProvider` — logs to console, no mail sent | Development, CI |
| `nodemailer` | `NodemailerEmailProvider` — sends via SMTP using the `nodemailer` npm package | Production + staging |

`NodemailerEmailProvider` reads SMTP config from env (`EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`,
`EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS`). Works with any SMTP server (Gmail, custom SMTP relay,
SendGrid SMTP bridge, AWS SES SMTP, etc.) — just set the env vars.

### When emails are sent

| Trigger | Recipient | Template |
|---|---|---|
| Payment confirmed (`PAID`) | Customer | Order confirmation (order number, items, total, estimated delivery) |
| Payment confirmed (`PAID`) | Admin (from Settings) | New order alert (same info, plus customer contact) |
| Admin sends newsletter | Subscriber list (filtered by language) | Newsletter template (`body_he`/`body_en`) |

### Email settings

Address/display config (from name, from address, reply-to) is stored in the `EmailSettings`
DB table and editable from the admin Email Services page (`/admin/email-services`). The
provider is selected via env for security.

### Phase-1 behavior

`ConsoleEmailProvider` logs the payload — no setup needed, no API keys required. Switch to
`nodemailer` by setting `EMAIL_PROVIDER=nodemailer` and the SMTP env vars.

## Security

- Never store raw card data — always delegate to the processor's hosted page/token.
- Server recomputes order totals before initiating payment.
- Validate amounts and installments server-side against the provider's reported limits.
