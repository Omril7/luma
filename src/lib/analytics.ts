// Analytics event helpers — push structured events to the GTM dataLayer.
// GTM is the only tag loader in this app (see .claude/docs/15-analytics.md); GA4 and the Meta
// Pixel are configured as tags inside the GTM container and read these dataLayer events.
// Never import gtag.js/fbq directly — everything routes through here.

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

export interface AnalyticsItem {
  item_id: string
  item_name: string
  item_category?: string
  price: number
  quantity?: number
}

function pushEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...params })
}

/** Converts agorot (integer) to a decimal ILS amount for GA4/Meta value fields. */
function toIls(agorot: number): number {
  return Math.round(agorot) / 100
}

export function trackViewItem(item: AnalyticsItem) {
  pushEvent('view_item', {
    currency: 'ILS',
    value: toIls(item.price),
    items: [{ ...item, price: toIls(item.price) }],
  })
}

export function trackAddToCart(item: AnalyticsItem) {
  pushEvent('add_to_cart', {
    currency: 'ILS',
    value: toIls(item.price * (item.quantity ?? 1)),
    items: [{ ...item, price: toIls(item.price) }],
  })
}

export function trackBeginCheckout(items: AnalyticsItem[], valueAgorot: number) {
  pushEvent('begin_checkout', {
    currency: 'ILS',
    value: toIls(valueAgorot),
    items: items.map((item) => ({ ...item, price: toIls(item.price) })),
  })
}

export function trackPurchase(orderId: string, items: AnalyticsItem[], valueAgorot: number) {
  pushEvent('purchase', {
    transaction_id: orderId,
    currency: 'ILS',
    value: toIls(valueAgorot),
    items: items.map((item) => ({ ...item, price: toIls(item.price) })),
  })
}

export function trackWhatsAppClick(location: string) {
  pushEvent('whatsapp_click', { click_location: location })
}

export function trackPageView(pagePath: string) {
  pushEvent('page_view', { page_path: pagePath })
}

export type ConsentStatus = 'granted' | 'denied'

/** Pushes a Consent Mode v2 update via the gtag() shim defined in GoogleTagManager.tsx. */
export function updateConsent(status: ConsentStatus) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push([
    'consent',
    'update',
    {
      analytics_storage: status,
      ad_storage: status,
      ad_user_data: status,
      ad_personalization: status,
    },
  ])
}
