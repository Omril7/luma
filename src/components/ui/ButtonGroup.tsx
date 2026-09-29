'use client'

export function ButtonGroup<T extends string>({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  'aria-label': string
}) {
  // Radio-group semantics: arrows move the selection, only the checked option is tabbable
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    let delta = 0
    if (e.key === 'ArrowRight') delta = rtl ? -1 : 1
    else if (e.key === 'ArrowLeft') delta = rtl ? 1 : -1
    else if (e.key === 'ArrowDown') delta = 1
    else if (e.key === 'ArrowUp') delta = -1
    if (!delta) return
    e.preventDefault()
    const next = options[(index + delta + options.length) % options.length]
    onChange(next.value)
    ;(e.currentTarget.parentElement?.children[options.indexOf(next)] as HTMLElement)?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex gap-1 rounded-lg border border-border bg-bg p-0.5"
    >
      {options.map((opt, i) => {
        const checked = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={[
              // inner radius = outer rounded-lg minus the container's p-0.5 (2px), so the curves are concentric
              'h-9 px-4 text-sm rounded-[calc(var(--radius-lg)-2px)] transition-colors cursor-pointer',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              checked
                ? 'bg-primary text-white font-medium shadow-sm'
                : 'text-text-main hover:bg-secondary',
            ].join(' ')}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
