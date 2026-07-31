'use client'

import { useUnreadContactCount } from './useUnreadContactCount'

interface ContactUnreadBadgeProps {
  /** 'badge' = numeric pill (expanded sidebar, dashboard tile); 'dot' = small corner dot (collapsed sidebar). */
  variant?: 'badge' | 'dot'
}

export function ContactUnreadBadge({ variant = 'badge' }: ContactUnreadBadgeProps) {
  const count = useUnreadContactCount()
  if (count <= 0) return null

  if (variant === 'dot') {
    return (
      <span
        className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-surface"
        role="status"
        aria-label={`${count} הודעות יצירת קשר חדשות`}
      />
    )
  }

  return (
    <span
      role="status"
      aria-label={`${count} הודעות יצירת קשר חדשות`}
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
