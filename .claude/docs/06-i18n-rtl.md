# 06 — i18n & RTL

Default language **Hebrew (RTL)**. Secondary **English (LTR)**. Library: **next-intl** (App
Router, server-component friendly), driven by a `[lang]` route segment (`/he/...`, `/en/...`).

## Two kinds of bilingual text — don't confuse them

1. **UI strings** (buttons, labels, errors, nav): live in message files
   `src/i18n/he.json` and `en.json`, accessed via next-intl's `t('key')` (from
   `useTranslations` in client components or `getTranslations` in server components). **Never
   hardcode.**
2. **Content** (product names/descriptions, FAQ, legal, image alt text): stored in the DB as
   `_he`/`_en` fields and selected at render time by current language. Not in i18n files.

A small helper picks the right content field:
```ts
const pick = (obj, lang) => lang === 'he' ? obj.name_he : obj.name_en; // generalize per field
```

## Setup

- **next-intl** with a `[lang]` route segment; locales `['he','en']`, default + fallback `he`.
  `src/i18n/` holds the config (request/locale resolution) and `he.json`/`en.json` messages.
- Message namespaces optional (e.g. `common`, `shop`, `checkout`, `admin`) to keep files
  manageable.
- The active locale comes from the URL segment. `languageStore` (localStorage) mirrors the
  user's preference for client widgets and to choose the default on first visit.

## RTL switching

- The locale lives in the route: `/he/...` vs `/en/...`. `app/[lang]/layout.tsx` reads `lang`
  and renders `<html lang={lang} dir={lang === 'he' ? 'rtl' : 'ltr'}>` on the server — so the
  correct direction is in the initial HTML (good for SSR/SEO, no flash).
- The header language switcher navigates to the same page under the other locale (e.g.
  `router.replace` swapping the `[lang]` segment) and updates `languageStore`.

## CSS must be direction-agnostic

- Use **logical** Tailwind utilities everywhere: `ps-*`/`pe-*` (not `pl`/`pr`),
  `ms-*`/`me-*` (not `ml`/`mr`), `text-start`/`text-end` (not `text-left`/`text-right`),
  `start-0`/`end-0` for positioning.
- Configure Tailwind for logical properties (logical-properties plugin or the built-in
  logical utilities). Avoid physical-direction classes in components — this is enforced by the
  `i18n-auditor` agent and review.
- Icons/chevrons that imply direction should flip with `dir` (use logical or `rtl:` variants).
- The floating WhatsApp button sits at the **start-bottom** (bottom-left in RTL) — position
  with logical `start`/`bottom`, configurable phone number.

## Translation key conventions

- Kebab/dot namespaced keys: `shop.filter.category`, `cart.coupon.apply`,
  `checkout.errors.required-email`.
- Keep `he.json` and `en.json` **in sync** — every key in one exists in the other. The
  `i18n-auditor` agent checks for missing keys and stray hardcoded strings.
- Interpolation for dynamic values: `t('cart.items', { count })`. Use i18next pluralization.
- Numbers/currency: format with `Intl.NumberFormat('he-IL', { style: 'currency',
  currency: 'ILS' })` (and `en-IL`/`en-US` as chosen) — don't hand-format ₪.

## Content coverage

- All product content, FAQ, and legal pages need full `_he` **and** `_en` text.
- Seed data must populate both languages so the language switcher is testable from day one.
- `Order.language` records which language the customer used (for emails/admin context).
