import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'footer' })
  const tNav = await getTranslations({ locale, namespace: 'nav' })

  const year = new Date().getFullYear()

  const shopLinks = [
    { href: '/shop', label: tNav('shop') },
    { href: '/gallery', label: tNav('gallery') },
    { href: '/about', label: tNav('about') },
  ]

  const infoLinks = [
    { href: '/contact', label: tNav('contact') },
    { href: '/terms', label: t('terms') },
    { href: '/privacy', label: t('privacy') },
    { href: '/returns', label: t('returns') },
  ]

  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand column */}
          <div>
            <p className="mb-2 text-2xl font-bold text-primary">Luma</p>
            <p className="text-sm leading-relaxed text-text-muted">{t('tagline')}</p>
          </div>

          {/* Shop links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-main">
              {t('shopLinks')}
            </h3>
            <ul className="space-y-2">
              {shopLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-text-muted transition-colors duration-150 hover:text-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-main">
              {t('infoLinks')}
            </h3>
            <ul className="space-y-2">
              {infoLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-text-muted transition-colors duration-150 hover:text-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-text-muted">
          &copy; {year} Luma. {t('rights')}
        </div>
      </div>
    </footer>
  )
}
