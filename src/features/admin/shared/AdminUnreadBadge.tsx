'use client'

import { useAdminUnreadCount } from './useAdminUnreadCount'
import { UnreadBadge } from './UnreadBadge'

interface AdminUnreadBadgeProps {
  endpoint: string
  /** a11y label suffix, e.g. "הודעות יצירת קשר חדשות" — prefixed with the live count. */
  label: string
  variant?: 'badge' | 'dot'
}

/** Self-fetching unread badge — polls `endpoint` and renders itself as a drop-in. */
export function AdminUnreadBadge({ endpoint, label, variant = 'badge' }: AdminUnreadBadgeProps) {
  const count = useAdminUnreadCount(endpoint)
  return <UnreadBadge count={count} variant={variant} label={`${count} ${label}`} />
}
