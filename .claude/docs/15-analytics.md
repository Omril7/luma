# 15 — Analytics: GA4 + GTM + WhatsApp click tracking

Planned 2026-08-16. Client runs Meta ad campaigns and only had Meta's own shallow "clicks to
website" number. Wants real on-site analytics (GA4 + GTM, his own suggestion), plus tracking
specifically on the WhatsApp CTA buttons. Since this is an e-commerce site with a real
checkout, the bigger win for his ad spend is conversion tracking (add-to-cart / begin-checkout
/ purchase), not just visit counting — confirmed with him: build the full funnel, play it safe
on consent (may get non-Israel visitors).

**Meta Pixel dropped from scope 2026-08-16.** The client already had a Pixel running his ad
campaigns and the plan was to reuse it inside GTM, but he couldn't locate the Pixel ID or get
Data Sources access in Events Manager (likely owned by an agency/Business Manager he isn't an
admin on) — not worth blocking the GA4 rollout on. Nothing in the architecture below is Meta
Pixel-specific, so adding it back later is a pure GTM-dashboard change (one tag + a trigger per
event), not a code change — see the mapping table further down for what it would look like.

## Architecture decision: GTM is the only loader

Everything routes through **Google Tag Manager**. The Next.js code never loads `gtag.js`
directly — it only pushes structured events to `window.dataLayer`. GA4 is configured as a
**tag inside the GTM container** (client's GTM dashboard, no code deploys needed to add/change
tags later — matches the "modular and extensible" project rule).

Why this beats loading `gtag.js` directly: the client can add, remove, or reconfigure tags
(e.g. later add the Meta Pixel, LinkedIn Insight, Hotjar) from the GTM UI without touching the
repo. It's also the standard, best-documented pattern for Consent Mode.

**IDs as env vars, not DB settings.** Precedent in this repo (`whatsappNumber`) is DB-backed
admin content, but the GTM container ID is deploy-time technical config (want it absent in
dev/preview so we don't pollute production analytics with test traffic), read synchronously in
a layout before any DB round trip. `NEXT_PUBLIC_GTM_ID` lives in `.env.example` /
`10-devops.md`. The GA4 Measurement ID is **not** an env var at all — it lives only inside the
GTM container config, since the code never talks to it directly.

**Scoped to storefront only.** The GTM script mounts in `StorefrontLayout.tsx` (server
component, already reads `getSiteSettings()` once), not the root layout — so admin-panel usage
by staff is never tracked. This mirrors how `SocialsSpeedDial`/`A11yWidget`/`ToastContainer`
are already storefront-only.

## Consent (Google Consent Mode v2)

A lightweight consent banner. Default state is **denied** for `analytics_storage`/
`ad_storage`/`ad_user_data`/`ad_personalization`, pushed to `dataLayer` _before_ the GTM
snippet loads, with `wait_for_update: 500` so GTM tags still fire (in a degraded/pinged,
cookieless mode) if the user never interacts. Accepting updates consent to granted; declining
keeps it denied. Choice persists in `localStorage` so the banner doesn't reappear. Mirrors the
existing `THEME_INIT_SCRIPT` inline-script pattern in `src/app/layout.tsx` (synchronous,
pre-paint, `dangerouslySetInnerHTML`).

Each GA4/Ads tag in GTM needs its built-in "Consent Settings" left at default (require
`analytics_storage`/`ad_storage`) — a GTM dashboard setting, not code (see checklist below).

## Code

- **`src/lib/analytics.ts`** — client-only dataLayer helpers, guarded by `typeof window !==
'undefined'`. Low-level `pushEvent(event, params?)`, plus typed wrappers: `trackViewItem`,
  `trackAddToCart`, `trackBeginCheckout`, `trackPurchase`, `trackWhatsAppClick(location)`.
- **`src/stores/consentStore.ts`** — Zustand + `persist` (same pattern as `cartStore.ts`),
  shape `{ status: 'unset' | 'granted' | 'denied', setStatus(...) }`.
- **`src/components/analytics/GoogleTagManager.tsx`** — server component. Renders nothing if
  `process.env.NEXT_PUBLIC_GTM_ID` is unset. Otherwise renders one inline `<script>` (dataLayer
  init + consent default, reading any prior choice from `localStorage` synchronously + the
  standard GTM loader snippet) and a `<noscript>` iframe fallback.
- **`src/components/analytics/ConsentBanner.tsx`** — `'use client'`. Bottom banner (Accept /
  Essential-only), i18n'd, RTL-safe, links to `/privacy`. On choice, updates `consentStore` and
  pushes `gtag('consent','update', {...})`.
- **`src/components/analytics/RouteChangeTracker.tsx`** — `'use client'`, mirrors
  `LangUpdater.tsx`'s mount/effect pattern. Skips first render (GTM's GA4 config tag already
  sends the initial `page_view`), pushes `page_view` on every subsequent client-side route
  change (App Router navigations don't trigger full page loads).

All three mount in `src/components/layouts/StorefrontLayout.tsx`.

## Event instrumentation (call sites)

| Event            | File                                                                                                                | Where                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `view_item`      | `src/features/products/ProductDetail.tsx`                                                                           | mount effect keyed on `product.id`                                                                                                                                                                            |
| `add_to_cart`    | `src/features/products/ProductDetail.tsx`                                                                           | end of `handleAddToCart`, after `addItem()`                                                                                                                                                                   |
| `begin_checkout` | `src/features/checkout/CheckoutClient.tsx`                                                                          | mount effect, using `items`/`subtotal()`/`total()` from `useCartStore`                                                                                                                                        |
| `purchase`       | `src/features/checkout/CheckoutClient.tsx`                                                                          | in `handleSubmit`, right after `POST /api/orders` succeeds, before `clear()` — uses the **cart's** `items` (has names/prices; `OrderDTO` line items only carry ids) + returned `order.id` as `transaction_id` |
| `whatsapp_click` | `SocialsSpeedDial.tsx` (floating widget), `HeroSection.tsx`, `home/ContactSection.tsx`, `contact/ContactClient.tsx` | `onClick` on each `wa.me` link, with a `click_location` label (`'floating'`, `'hero'`, `'home_contact'`, `'contact_page'`)                                                                                    |

Payload shape (GA4 ecommerce standard, `currency: 'ILS'`):

```ts
{ event: 'add_to_cart', currency: 'ILS', value, items: [{ item_id, item_name, item_category, price, quantity }] }
```

`CartItem.unitPrice/totalPrice` in `src/stores/cartStore.ts` — check whether stored in agorot
or decimal ILS; divide by 100 for `value`/`price` fields if agorot, since GA4 expects decimal
currency amounts.

GTM fans each dataLayer event out to a GA4 Event tag using this mapping (client's GTM setup,
not code):

| dataLayer event  | GA4 event                       |
| ---------------- | ------------------------------- |
| `view_item`      | `view_item`                     |
| `add_to_cart`    | `add_to_cart`                   |
| `begin_checkout` | `begin_checkout`                |
| `purchase`       | `purchase`                      |
| `whatsapp_click` | `whatsapp_click` (custom event) |

If the Meta Pixel gets added back later: same triggers, one more tag per row (Meta Pixel
"Track Event") mapped to `ViewContent`/`AddToCart`/`InitiateCheckout`/`Purchase`/`Contact`
respectively.

## i18n

`cookieConsent` namespace in `src/i18n/he.json` / `en.json` (banner copy). Short "Cookies &
Analytics" section added to the existing `privacy` translation keys used by
`LegalPageContent` (`src/app/[lang]/(storefront)/privacy/page.tsx`) — reused, no new page.

## Env vars

```dotenv
# --- analytics ---
NEXT_PUBLIC_GTM_ID=            # GTM-XXXXXXX; GA4 is configured as a tag inside this container
```

## Manual dashboard setup checklist (client-side, outside this repo)

1. Create the GTM container (web) → `GTM-XXXXXXX` → set as `NEXT_PUBLIC_GTM_ID` in Vercel env
   (Production + Preview) and local `.env.local`.
2. Create the GA4 property + web data stream → `G-XXXXXXX`.
3. In GTM: add a **GA4 Configuration** tag with that Measurement ID, trigger "All Pages" +
   "Consent Initialization - All Pages"; keep its default Consent Settings (require
   `analytics_storage`).
4. In GTM: add one **GA4 Event** tag per event in the mapping table above, each triggered by a
   Custom Event trigger matching the dataLayer `event` name.
5. In GTM: add **Scroll Depth** and **Outbound Click** triggers (both GTM built-ins, no
   code needed) — see the "Scroll depth & outbound clicks" section below. Skippable if GA4's
   own Enhanced Measurement (Admin → Data Streams) already covers it well enough.
6. In GTM: enable **Consent Mode** overview (Admin → Container Settings), confirm the GA4
   Configuration tag's Consent Settings require `analytics_storage` (default).
7. Test with GTM **Preview mode** and GA4 **DebugView** before publishing the container
   version.

### Scroll depth & outbound clicks

Not sent from app code — these are generic signals GTM captures on its own via built-in
trigger types, so they belong entirely in the dashboard setup, not the codebase:

- **Scroll depth:** enable the `Scroll Depth Threshold` built-in variable → new **Scroll
  Depth** trigger (25/50/75/90%, All Pages) → GA4 Event tag, event name `scroll_depth`,
  parameter `percent_scrolled` = `{{Scroll Depth Threshold}}`.
- **Outbound clicks:** enable the `Click URL` built-in variable → new **Just Links** trigger,
  "Some Link Clicks" where `Click URL` does not contain the site's own domain → GA4 Event
  tag, event name `click`, parameters `link_url` = `{{Click URL}}`, `outbound` = `true`.

Note GA4's **Enhanced Measurement** (Admin → Data Streams → the web stream, on by default for
new properties) already auto-tracks 90% scroll and outbound clicks with zero setup. The GTM
triggers above are only worth building for custom thresholds.

## Verification

- `npm run typecheck` / `npm run lint`.
- Local: set a real `NEXT_PUBLIC_GTM_ID` (or a GTM test container) in `.env.local`, `npm run
dev`, confirm via GTM Preview mode + browser devtools `window.dataLayer` that: consent
  defaults to denied, the banner appears once and persists choice across reloads, all four
  ecommerce events fire at the right points with sane payloads, all 4 WhatsApp buttons push
  `whatsapp_click` with the correct `click_location`, and `page_view` fires on client-side
  route changes but isn't double-fired on first load.
- Confirm admin routes (`/admin/**`) never load the GTM script.
