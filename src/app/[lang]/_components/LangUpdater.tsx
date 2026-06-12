'use client'

import { useEffect } from 'react'

/** Runs on mount/locale change to sync <html lang dir> from the [lang] segment */
export function LangUpdater({ lang }: { lang: string }) {
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('lang', lang)
    html.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr')
  }, [lang])

  return null
}
