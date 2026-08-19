// Sidebar/dashboard hrefs that show an unread badge, mapped to their count endpoint
// + an a11y label suffix (prefixed with the live count by AdminUnreadBadge). Shared
// between AdminShell (sidebar) and the dashboard quick-link grid. `label` must stay a
// plain string, not a function — this config is passed from Server Components (e.g.
// admin/page.tsx) into the client AdminUnreadBadge, and functions can't cross that boundary.
export const UNREAD_BADGE_CONFIG: Record<string, { endpoint: string; label: string }> = {
  '/admin/contact': {
    endpoint: '/api/admin/contact-messages/unread-count',
    label: 'הודעות יצירת קשר חדשות',
  },
  '/admin/price-offers': {
    endpoint: '/api/admin/price-offers/unread-count',
    label: 'בקשות הצעת מחיר חדשות',
  },
  '/admin/reviews': {
    endpoint: '/api/admin/reviews/unread-count',
    label: 'ביקורות חדשות',
  },
}
