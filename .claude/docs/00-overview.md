# 00 — Overview

## Product vision

A warm, natural, rustic-modern storefront for a handmade custom-furniture business. The site
must feel cozy and image-forward (the furniture is the selling point), work flawlessly on
mobile, and serve Israeli customers in Hebrew (RTL) by default with English (LTR) as a
secondary language.

The **differentiator** is custom-dimension pricing: a customer can pick a standard size
(S/M/L) or enter their own width/height/depth and see a price calculated in real time. That
calculator is the heart of the product — prioritize it.

## Target users

- **Primary:** Israeli consumers browsing on phones, paying by credit card (often in
  installments), reading Hebrew.
- **Secondary:** English-speaking customers.
- **Admin:** the craftsman / shop operator managing products, content, and coupons through a
  simple but polished admin panel. Order fulfillment is handled separately by **luma-manager**.

## Glossary

| Term | Meaning |
|---|---|
| **Variant** | A predefined size tier of a product (S/M/L) with fixed dimensions and a fixed price. |
| **Custom dimensions** | Customer-entered width/height/depth/diameter, priced by the engine. |
| **Base tier** | The variant used as the starting price for a custom order — the closest variant that is *not larger* than the requested dimensions. |
| **Per-cm rate** | How much each extra cm in a dimension adds, defined per product in `CustomPricingRule`. |
| **Surcharge** | The amount added on top of the base tier price for custom dimensions (and, later, color). |
| **Bilingual fields** | Every content field exists twice: `_he` and `_en`. |
| **luma-manager** | Companion app (`C:\Users\omril\Projects\luma-manager`) that handles order fulfillment. Shares the same Supabase database — reads/updates order status. |

## Phase scope

| Capability | Phase 1 (build now) | Phase 2 (post-launch) |
|---|---|---|
| Project setup + tooling | ✅ | |
| DB schema (ALL models incl. phase-2 + luma-manager tables) | ✅ | |
| Catalog + variants + custom pricing engine | ✅ | |
| Product page w/ live custom price calculator | ✅ | |
| Cart with coupons (all coupon types) | ✅ | |
| Checkout (payment **stubbed**) | ✅ | |
| i18n he/en + full RTL | ✅ | |
| Admin: products, site content, coupons, newsletter (send), email services | ✅ | |
| Contact + WhatsApp, FAQ, legal pages | ✅ | |
| Wishlist + comparison pages | ✅ | |
| Accessibility widget (legally required in IL) | ✅ | |
| SEO meta tags, responsive, seed data | ✅ | |
| Cloudinary image storage | ✅ | |
| motion/react (Framer Motion) animations | ✅ | |
| Payment processor integration | | ✅ |
| Bundles (model now, UI later) | shell | ✅ |
| Reviews + moderation (model now, UI later) — carousel via **embla-carousel** | shell | ✅ |
| Instagram feed, GA | placeholder | ✅ |
| Gallery management in admin | basic | ✅ |
| Order notification emails (wire to SendGrid/SES) | stub | ✅ |
| Advanced regional shipping calculator | | ✅ |

## How to use these docs

- Start here, then read `01-architecture.md` for the big picture.
- `03-pricing-engine.md` is the most important domain doc — read it before touching pricing.
- `.claude/ROADMAP.md` is the ordered, checkbox-driven build plan. Update it as work lands.
- The root `CLAUDE.md` holds the non-negotiable golden rules.
