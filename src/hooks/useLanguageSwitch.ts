'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { Locale } from '@/shared/constants'

const LOCALES = ['he', 'en'] as const

export function useLanguageSwitch() {
  // Raw Next.js pathname — always includes locale prefix with localePrefix:'always'
  // e.g. /he, /he/shop, /en, /en/shop
  const rawPathname = usePathname()
  const router = useRouter()

  // First path segment after leading slash is the locale
  const firstSegment = rawPathname.split('/')[1] ?? ''
  const locale: Locale = LOCALES.includes(firstSegment as Locale) ? (firstSegment as Locale) : 'he'
  const isHebrew = locale === 'he'

  const switchTo = (targetLocale: Locale) => {
    // Strip the leading /he or /en to get the bare path
    const withoutLocale = LOCALES.includes(firstSegment as Locale)
      ? rawPathname.slice(firstSegment.length + 1) // remove /he or /en
      : rawPathname
    const cleanPath = withoutLocale || '/'

    router.push(`/${targetLocale}${cleanPath === '/' ? '' : cleanPath}`)
  }

  return { locale, switchTo, isHebrew }
}
