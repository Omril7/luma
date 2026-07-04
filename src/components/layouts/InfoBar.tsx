interface InfoBarProps {
  locale: string
  hours: string
}

export function InfoBar({ locale, hours }: InfoBarProps) {
  if (!hours) return null

  return (
    <div className="hidden bg-charcoal md:block">
      <div className="mx-auto flex h-8 max-w-7xl items-center justify-center px-4 md:px-8">
        <p
          className="truncate text-xs text-[var(--color-charcoal-muted)]"
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        >
          {hours}
        </p>
      </div>
    </div>
  )
}
