'use client'

import { Link } from '@/i18n/navigation'
import { useUiStore } from '@/stores/uiStore'

interface LogoProps {
  className?: string
  inverted?: boolean
}

export function Logo({ className, inverted }: LogoProps) {
  const { a11y } = useUiStore()
  // Mirrors Footer's logic: once dark mode / high contrast override the page's
  // swappable tokens, the inverted (footer) logo should follow those tokens
  // too instead of the fixed charcoal-fg color.
  const useThemeTokens = inverted && (a11y.contrast || a11y.dark)
  const invertedCls = useThemeTokens ? 'text-text-main' : 'text-[var(--color-charcoal-fg)]'

  return (
    <Link
      href="/"
      className={['group inline-flex flex-shrink-0 items-center gap-2.5', className]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Masked with the logo's alpha shape so it's tinted via currentColor to exactly match the wordmark */}
      <span
        role="img"
        aria-label="Luma"
        style={{
          maskImage: 'url(/logo-white.png)',
          WebkitMaskImage: 'url(/logo-white.png)',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
        className={[
          'h-7 w-7 shrink-0 bg-current transition-opacity duration-150 md:h-8 md:w-8 group-hover:opacity-80',
          inverted ? invertedCls : 'text-text-main',
        ].join(' ')}
      />
      <span
        className={[
          'font-heading text-2xl tracking-wide',
          inverted ? invertedCls : 'text-text-main',
        ].join(' ')}
      >
        Luma Studio
      </span>
    </Link>
  )
}
