'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Logo } from '@/components/ui/Logo'
import { FEATURES } from '@/lib/featureFlags'
import { useUiStore } from '@/stores/uiStore'

export function Footer() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const { a11y } = useUiStore()

  // The footer is a fixed dark "brand band" (charcoal) regardless of the site's
  // light theme. But dark mode / high contrast already redefine --color-bg,
  // --color-text, --color-primary etc. for the rest of the page — so once one
  // of those modes is active, the footer switches to those same swapped tokens
  // instead of its own fixed charcoal palette, keeping it in sync everywhere else.
  const themeOverride = a11y.contrast || a11y.dark

  const year = new Date().getFullYear()

  const shopLinks = [
    ...(FEATURES.shop ? [{ href: '/shop', label: tNav('shop') }] : []),
    { href: '/gallery', label: tNav('gallery') },
    { href: '/about', label: tNav('about') },
  ]

  const infoLinks = [
    { href: '/contact', label: tNav('contact') },
    { href: '/faq', label: t('faq') },
    // Legal pages ship alongside the shop/checkout flow (M1.21) — hidden while FEATURES.shop is off.
    ...(FEATURES.shop
      ? [
          { href: '/terms', label: t('terms') },
          { href: '/privacy', label: t('privacy') },
          { href: '/returns', label: t('returns') },
        ]
      : []),
  ]

  const headingCls = themeOverride ? 'text-primary' : 'text-[var(--color-charcoal-heading)]'
  const fgCls = themeOverride ? 'text-text-main' : 'text-[var(--color-charcoal-fg)]'
  const fgHoverCls = themeOverride
    ? 'hover:text-primary'
    : 'hover:text-[var(--color-charcoal-heading)]'
  const mutedCls = themeOverride ? 'text-text-muted' : 'text-[var(--color-charcoal-muted)]'
  const lineCls = themeOverride ? 'border-border' : 'border-[var(--color-charcoal-line)]'

  return (
    <footer className={themeOverride ? 'bg-bg' : 'bg-charcoal'}>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand column */}
          <div>
            <Logo inverted className="mb-3" />
            <p className={`text-sm leading-relaxed ${mutedCls}`}>{t('tagline')}</p>
          </div>

          {/* Shop links */}
          <div>
            <h3 className={`mb-4 text-sm font-semibold uppercase tracking-wider ${headingCls}`}>
              {t('shopLinks')}
            </h3>
            <ul className="space-y-2">
              {shopLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`text-sm ${fgCls} ${fgHoverCls} transition-colors duration-150`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info links */}
          <div>
            <h3 className={`mb-4 text-sm font-semibold uppercase tracking-wider ${headingCls}`}>
              {t('infoLinks')}
            </h3>
            <ul className="space-y-2">
              {infoLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`text-sm ${fgCls} ${fgHoverCls} transition-colors duration-150`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className={`mt-10 border-t ${lineCls} pt-6 text-center text-xs ${mutedCls}`}>
          &copy; {year} Luma. {t('rights')}
        </div>
      </div>
    </footer>
  )
}
