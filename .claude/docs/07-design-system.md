# 07 — Design System

**Aesthetic:** warm, natural, rustic-modern. Wood textures, earthy tones, cozy. Images are the
selling point — present them large and clean. Mobile-first.

## Theme via CSS custom properties

All colors and fonts are CSS variables (defined once in `src/styles/theme.css`) so they
can be re-skinned without touching components. Tailwind reads them via `theme.extend` mapping
to `var(--…)`. **No hardcoded hex in components.**

```css
:root {
  /* color palette — starting point, all swappable */
  --color-primary: #8B6914;      /* warm wood brown */
  --color-primary-600: #6f5410;
  --color-secondary: #F5F0E8;    /* cream / beige */
  --color-accent: #C26B3D;       /* terracotta / burnt orange */
  --color-text: #2E2A24;         /* dark brown / charcoal */
  --color-text-muted: #6b6358;
  --color-bg: #FBF8F3;           /* warm off-white */
  --color-surface: #ffffff;
  --color-border: #e7ded2;

  /* typography */
  --font-he: 'Heebo', 'Rubik', system-ui, sans-serif;
  --font-en: 'Inter', 'Heebo', system-ui, sans-serif;  /* Latin pair */

  /* shape & elevation */
  --radius: 0.75rem;
  --radius-lg: 1.25rem;
  --shadow-soft: 0 4px 20px rgba(46, 42, 36, 0.08);

  /* accessibility (overridable by the a11y widget) */
  --font-scale: 1;
}
html[lang='en'] { --font-base: var(--font-en); }
html[lang='he'] { --font-base: var(--font-he); }
```

Tailwind config maps tokens, e.g. `colors: { primary: 'var(--color-primary)', … }`,
`fontFamily: { base: 'var(--font-base)' }`, `borderRadius`, `boxShadow`.

## Typography

- Hebrew: **Heebo** or **Rubik** (Google Fonts, strong RTL support).
- English: a complementary Latin font (e.g. Inter) paired via `--font-en`.
- Font family chosen by `html[lang]` so each language renders in its best face.
- Generous line-height and whitespace; large readable body on mobile.

## UI patterns

- Rounded corners (`--radius`), soft shadows (`--shadow-soft`), generous whitespace.
- Buttons: primary (wood brown), secondary (outline/cream), accent (terracotta) for key CTAs.
- Subtle, non-flashy transitions (hover lifts, fade/slide on reveal). Respect
  `prefers-reduced-motion`.
- High-quality image presentation: aspect-ratio boxes, `object-cover`, lazy loading, skeleton
  placeholders.
- Consistent spacing scale via Tailwind defaults; mobile-first breakpoints (`sm md lg xl`).

## Floating WhatsApp button

- Fixed at **start-bottom** (bottom-left under RTL, bottom-right under LTR — use logical
  `inset-block-end`/`inset-inline-start`). Configurable phone number (env/settings).
- Opens `https://wa.me/<number>` with an optional prefilled localized message.

## Accessibility widget (legally required in Israel)

A persistent, keyboard-reachable widget (in `StorefrontLayout`) offering at minimum:
- Font-size increase/decrease (drives `--font-scale`; components use `rem`).
- High-contrast toggle (swaps a high-contrast token set / `data-contrast` on `<html>`).
- Optional: links underline, reduce motion, reset.

Settings persist via `uiStore`. You may use a vetted library (e.g. an accessibility-widget
package) or build a small custom one — but it must be real and functional, not decorative.
General a11y baseline: semantic HTML, labelled controls, visible focus, sufficient contrast,
alt text from `ProductImage.altText_he/_en`.

> **Implementation note:** The widget must be **draggable** — use `motion/react` (`useMotionValue` + `useDragControls`) so users can reposition it anywhere on screen without it obscuring content.

## Motion & animations

Use `motion/react` (Framer Motion) for UI animations throughout the storefront. Keep animations subtle and purposeful:
- Wrap interactive elements (`Button`, `Card`, product tiles, modals) with `motion.*` variants for hover/tap/enter transitions.
- Prefer `layout` animations for list reorders (cart, gallery).
- Respect `prefers-reduced-motion` — gate all animations behind the `reduce motion` a11y setting (stored in `uiStore`).
- Shared layout transitions (e.g. cart drawer open/close, image zoom) use `<AnimatePresence>`.

## RTL

All of the above must be direction-agnostic — see `06-i18n-rtl.md`. Use logical properties; do
not assume left/right.
