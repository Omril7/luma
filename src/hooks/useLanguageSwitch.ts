'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import type { Locale } from '@/shared/constants'

export function useLanguageSwitch() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  const switchTo = (lang: Locale) => {
    router.replace(pathname, { locale: lang })
  }

  return { locale, switchTo, isHebrew: locale === 'he' }
}
