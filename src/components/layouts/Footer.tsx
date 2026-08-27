'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Logo } from '@/components/ui/Logo'
import { FEATURES } from '@/lib/featureFlags'
import { useUiStore } from '@/stores/uiStore'
import { InstagramIcon } from '@/components/icons/InstagramIcon'
import { FacebookIcon } from '@/components/icons/FacebookIcon'
import { FooterContactForm } from '@/features/contact/FooterContactForm'

interface FooterProps {
  instagramUrl?: string
  facebookUrl?: string
  tagline?: string
}

export function Footer({ instagramUrl, facebookUrl, tagline }: FooterProps) {
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
    // Terms/privacy/accessibility are legal requirements independent of whether checkout is
    // live (an accessibility statement is legally required in Israel regardless of e-commerce
    // status) — always shown. Returns policy only matters once purchasing is live.
    { href: '/terms', label: t('terms') },
    { href: '/privacy', label: t('privacy') },
    { href: '/accessibility', label: t('accessibility') },
    ...(FEATURES.shop ? [{ href: '/returns', label: t('returns') }] : []),
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
            <p className={`text-sm leading-relaxed ${mutedCls}`}>{tagline || t('tagline')}</p>
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
                    <FacebookIcon aria-hidden="true" size={20} />
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

        {/* Contact form */}
        <div className={`mt-10 border-t ${lineCls} pt-8`}>
          <div className="mx-auto max-w-3xl text-center">
            <h3 className={`mb-1 text-sm font-semibold uppercase tracking-wider ${headingCls}`}>
              {t('contactHeading')}
            </h3>
            <FooterContactForm
              className="mt-3 text-start"
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
