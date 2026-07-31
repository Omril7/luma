'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'
import { Link } from '@/i18n/navigation'

interface RouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/** Shared body for route-level `error.tsx` boundaries — logs the error and offers retry/home. */
export function RouteError({ error, reset }: RouteErrorProps) {
  const t = useTranslations('errorPage')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold text-text-main md:text-3xl">
        {t('title')}
      </h1>
      <p className="mt-3 max-w-md text-text-muted">{t('body')}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-surface transition-opacity hover:opacity-90 cursor-pointer"
        >
          <RefreshCw size={16} aria-hidden="true" />
          {t('retry')}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-5 py-2.5 font-medium text-text-main transition-colors hover:bg-secondary"
        >
          {t('home')}
        </Link>
      </div>
    </div>
  )
}
