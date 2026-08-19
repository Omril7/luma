'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'

const POLL_INTERVAL_MS = 30_000

/** Polls an admin "unread-count" endpoint for the sidebar/dashboard badges. */
export function useAdminUnreadCount(endpoint: string): number {
  const { token } = useAdminStore()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function fetchCount() {
      try {
        const data = await api.get<{ count: number }>(endpoint, token ?? undefined)
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
  }, [token, endpoint])

  return count
}
