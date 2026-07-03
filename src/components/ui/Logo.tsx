import { Link } from '@/i18n/navigation'

interface LogoProps {
  className?: string
  inverted?: boolean
}

export function Logo({ className, inverted }: LogoProps) {
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
          inverted ? 'text-secondary' : 'text-text-main',
        ].join(' ')}
      />
      <span
        className={[
          'font-heading text-2xl tracking-wide',
          inverted ? 'text-secondary' : 'text-text-main',
        ].join(' ')}
      >
        Luma Studio
      </span>
    </Link>
  )
}
