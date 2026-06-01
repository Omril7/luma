# 06 — i18n & RTL

Default language **Hebrew (RTL)**. Secondary **English (LTR)**. Library: `react-i18next`.

## Two kinds of bilingual text — don't confuse them

1. **UI strings** (buttons, labels, errors, nav): live in translation files
   `client/src/i18n/he.json` and `en.json`, accessed via `t('key')`. **Never hardcode.**
2. **Content** (product names/descriptions, FAQ, legal, image alt text): stored in the DB as
   `_he`/`_en` fields and selected at render time by current language. Not in i18n files.

A small helper picks the right content field:
```ts
const pick = (obj, lang) => lang === 'he' ? obj.name_he : obj.name_en; // generalize per field
```

## Setup

- `i18next` + `react-i18next`, resources `{ he, en }`, default + fallback `he`.
- Namespaces optional (e.g. `common`, `shop`, `checkout`, `admin`) to keep files manageable.
- Language persisted via `languageStore` (localStorage). On load, restore and apply.

## RTL switching

- `languageStore.setLanguage(lang)` must:
  1. `i18n.changeLanguage(lang)`
  2. set `document.documentElement.lang = lang`
  3. set `document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'`
- The header language switcher toggles between he/en.

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
