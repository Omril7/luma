'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'

const POLL_INTERVAL_MS = 30_000

/** Polls the count of unread ("NEW") contact messages for the admin sidebar/dashboard badges. */
export function useUnreadContactCount(): number {
  const { token } = useAdminStore()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function fetchCount() {
      try {
        const data = await api.get<{ count: number }>(
          '/api/admin/contact-messages/unread-count',
          token ?? undefined
        )
        if (!cancelled) setCount(data.count)
      } catch {
        // Best-effort — a failed poll just keeps showing the previous count.
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [token])

  return count
}
