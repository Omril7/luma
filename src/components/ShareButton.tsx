'use client'

import { Share2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useUiStore } from '@/stores/uiStore'

interface ShareButtonProps {
  title: string
  text?: string
  /** Explicit URL to share; defaults to the current page URL. */
  url?: string
  className?: string
  children?: React.ReactNode
}

const defaultCls =
  'flex min-h-[52px] min-w-[52px] items-center justify-center rounded-full border border-border bg-surface hover:bg-secondary transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function ShareButton({ title, text, url: urlProp, className, children }: ShareButtonProps) {
  const t = useTranslations('product')
  const { addToast } = useUiStore()

  async function handleShare() {
    const url = urlProp ?? window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch (err) {
        // AbortError fires when the user dismisses the native share sheet — not a failure.
        if (!(err instanceof Error && err.name === 'AbortError')) {
          addToast({ type: 'error', message: t('shareCopyFailed') })
        }
      }
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      addToast({ type: 'success', message: t('shareCopied') })
    } catch {
      addToast({ type: 'error', message: t('shareCopyFailed') })
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={t('share')}
      className={className ?? defaultCls}
    >
      {children ?? <Share2 size={22} aria-hidden="true" className="text-text-muted" />}
    </button>
  )
}
