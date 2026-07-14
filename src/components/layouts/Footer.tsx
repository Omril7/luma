'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Logo } from '@/components/ui/Logo'
import { FEATURES } from '@/lib/featureFlags'
import { useUiStore } from '@/stores/uiStore'
import { InstagramIcon } from '@/components/icons/InstagramIcon'
import { NewsletterSignupForm } from '@/features/newsletter/NewsletterSignupForm'

interface FooterProps {
  instagramUrl?: string
  facebookUrl?: string
}

export function Footer({ instagramUrl, facebookUrl }: FooterProps) {
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
    { href: '/shop', label: tNav('shop') },
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
            {(instagramUrl || facebookUrl) && (
              <div className="flex items-center gap-1 mt-4 -ms-2.5">
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('instagramLabel')}
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${fgCls} ${fgHoverCls} transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                  >
                    <InstagramIcon aria-hidden="true" className="h-5 w-5" />
                  </a>
                )}
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('facebookLabel')}
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${fgCls} ${fgHoverCls} transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path d="M13.5 21v-7.8h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.49-1.46H16.6V4.14C16.34 4.1 15.46 4 14.44 4c-2.13 0-3.59 1.3-3.59 3.68v2.52H8.25v3h2.6V21h2.65z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
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

        {/* Newsletter signup */}
        <div className={`mt-10 border-t ${lineCls} pt-8`}>
          <div className="mx-auto max-w-md text-center">
            <h3 className={`mb-1 text-sm font-semibold uppercase tracking-wider ${headingCls}`}>
              {t('newsletterHeading')}
            </h3>
            <NewsletterSignupForm
              className="mt-3"
              labelClassName={`mb-3 text-sm ${mutedCls}`}
              inputClassName={`min-h-[44px] w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                themeOverride
                  ? 'border-border bg-surface text-text-main placeholder:text-text-muted/70'
                  : 'border-white/20 bg-white/10 text-white placeholder:text-white/50'
              }`}
            />
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
