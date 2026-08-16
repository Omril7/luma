'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

// GTM's GA4 config tag already sends a page_view on initial container load — this only needs
// to cover subsequent App Router client-side navigations, which don't trigger a full page load.
export function RouteChangeTracker() {
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    trackPageView(pathname)
  }, [pathname])

  return null
}
