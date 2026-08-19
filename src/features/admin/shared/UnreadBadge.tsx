'use client'

interface UnreadBadgeProps {
  count: number
  /** 'badge' = numeric pill (expanded sidebar, dashboard tile); 'dot' = small corner dot (collapsed sidebar). */
  variant?: 'badge' | 'dot'
  /** Accessible label, e.g. "5 הודעות יצירת קשר חדשות". */
  label: string
}

export function UnreadBadge({ count, variant = 'badge', label }: UnreadBadgeProps) {
  if (count <= 0) return null

  if (variant === 'dot') {
    return (
      <span
        className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-surface"
        role="status"
        aria-label={label}
      />
    )
  }

  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
