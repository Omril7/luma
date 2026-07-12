'use client'

import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  'aria-label'?: string
}

const SIZE_PX = { sm: 14, md: 20, lg: 28 }

export function StarRating({
  value,
  onChange,
  size = 'md',
  readonly = false,
  'aria-label': ariaLabel,
}: StarRatingProps) {
  const px = SIZE_PX[size]
  const stars = [1, 2, 3, 4, 5]

  if (readonly) {
    return (
      <div
        role="img"
        aria-label={ariaLabel ?? `${value} / 5`}
        className="flex items-center gap-0.5"
      >
        {stars.map((n) => (
          <Star
            key={n}
            size={px}
            aria-hidden="true"
            className={n <= value ? 'fill-accent text-accent' : 'fill-none text-border'}
          />
        ))}
      </div>
    )
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex items-center gap-1">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={String(n)}
          onClick={() => onChange?.(n)}
          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-text-muted transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
        >
          <Star
            size={px}
            aria-hidden="true"
            className={n <= value ? 'fill-accent text-accent' : 'fill-none text-border'}
          />
        </button>
      ))}
    </div>
  )
}
