import {
  LayoutDashboard,
  Package,
  // Tag,
  FileText,
  // Mail,
  Send,
  ImageIcon,
  Settings,
  ShoppingBag,
  // PackageOpen,
  Star,
  MessageSquareQuote,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'
import { InstagramIcon } from '@/components/icons/InstagramIcon'

export interface AdminNavCategory {
  id: string
  label: string
}

// Sidebar accordion groups, in display order. The dashboard link is rendered
// on its own above the groups (see AdminShell) and has no category.
export const ADMIN_NAV_CATEGORIES: AdminNavCategory[] = [
  { id: 'catalog', label: 'קטלוג' },
  { id: 'content', label: 'תוכן ושיווק' },
  { id: 'inquiries', label: 'פניות לקוחות' },
  { id: 'system', label: 'מערכת' },
]

export interface AdminNavItem {
  href: string
  icon: LucideIcon | typeof InstagramIcon
  label: string
  desc: string
  /** Sidebar accordion group (see ADMIN_NAV_CATEGORIES). Omitted only for the dashboard link. */
  category?: string
  /** Sidebar active-state match: exact path only (used for '/admin' so it doesn't match every sub-route). */
  exact?: boolean
  /** Opens in a new tab; not a route inside this app (e.g. the luma-manager orders link). */
  external?: boolean
  /** Not available yet — rendered disabled with a "בקרוב" badge instead of a link. */
  comingSoon?: boolean
}

// Single source of truth for both the admin sidebar (AdminShell) and the dashboard
// quick-link grid (admin/page.tsx) — one entry per admin section.
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: '/admin',
    icon: LayoutDashboard,
    label: 'לוח בקרה',
    desc: 'סקירה כללית וקישורים מהירים',
    exact: true,
  },
  {
    href: '/admin/products',
    icon: Package,
    label: 'מוצרים',
    desc: 'ניהול קטלוג המוצרים, קטגוריות, צבעים, גרסאות ומחירים',
    category: 'catalog',
  },
  // { href: '/admin/coupons', icon: Tag, label: 'קופונים', desc: 'יצירה וניהול קודי הנחה', category: 'catalog' },
  {
    href: '/admin/content',
    icon: FileText,
    label: 'תוכן האתר',
    desc: 'עריכת הטקסטים והתוכן הסטטי',
    category: 'content',
  },
  // { href: '/admin/email-services', icon: Mail, label: 'שירותי דואר', desc: 'הגדרות שליחת מיילים', category: 'system' },
  {
    href: '/admin/newsletter',
    icon: Send,
    label: 'ניוזלטר',
    desc: 'רשימת מנויים ושליחת עדכונים',
    category: 'content',
  },
  {
    href: '/admin/gallery',
    icon: ImageIcon,
    label: 'גלריה',
    desc: 'ניהול תמונות הגלריה',
    category: 'content',
  },
  {
    href: '/admin/instagram',
    icon: InstagramIcon,
    label: 'אינסטגרם',
    desc: 'ניהול פיד האינסטגרם המוצג באתר',
    category: 'content',
  },
  // { href: '/admin/bundles', icon: PackageOpen, label: 'חבילות', desc: 'ניהול חבילות מוצרים במחיר מיוחד', category: 'catalog' },
  {
    href: '/admin/reviews',
    icon: Star,
    label: 'ביקורות',
    desc: 'אישור ופרסום ביקורות לקוחות',
    category: 'inquiries',
  },
  {
    href: '/admin/price-offers',
    icon: MessageSquareQuote,
    label: 'הצעות מחיר',
    desc: 'בקשות להצעת מחיר מלקוחות מתעניינים',
    category: 'inquiries',
  },
  {
    href: '/admin/contact',
    icon: MessageSquare,
    label: 'יצירת קשר',
    desc: 'הודעות שהתקבלו מטופס יצירת הקשר באתר',
    category: 'inquiries',
  },
  {
    href: '/admin/settings',
    icon: Settings,
    label: 'הגדרות',
    desc: 'פרטי העסק, משלוח ו-WhatsApp',
    category: 'system',
  },
  {
    href: 'https://luma-manager.vercel.app/orders',
    icon: ShoppingBag,
    label: 'ניהול הזמנות',
    desc: 'צפייה וטיפול בהזמנות הלקוחות',
    external: true,
    comingSoon: true,
  },
]
