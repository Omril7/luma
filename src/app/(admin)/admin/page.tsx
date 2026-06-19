import { type Metadata } from 'next'
import Link from 'next/link'
import {
  Package,
  Tag,
  FileText,
  Mail,
  Send,
  ImageIcon,
  Settings,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react'

export const metadata: Metadata = { title: 'לוח בקרה — Luma ניהול' }

const QUICK_LINKS = [
  {
    href: '/admin/products',
    icon: Package,
    title: 'מוצרים',
    desc: 'ניהול קטלוג המוצרים, גרסאות ומחירים',
  },
  {
    href: '/admin/coupons',
    icon: Tag,
    title: 'קופונים',
    desc: 'יצירה וניהול קודי הנחה',
  },
  {
    href: '/admin/content',
    icon: FileText,
    title: 'תוכן האתר',
    desc: 'עריכת הטקסטים והתוכן הסטטי',
  },
  {
    href: '/admin/email-services',
    icon: Mail,
    title: 'שירותי דואר',
    desc: 'הגדרות שליחת מיילים',
  },
  {
    href: '/admin/newsletter',
    icon: Send,
    title: 'ניוזלטר',
    desc: 'רשימת מנויים ושליחת עדכונים',
  },
  {
    href: '/admin/gallery',
    icon: ImageIcon,
    title: 'גלריה',
    desc: 'ניהול תמונות הגלריה',
  },
  {
    href: '/admin/settings',
    icon: Settings,
    title: 'הגדרות',
    desc: 'פרטי העסק, משלוח ו-WhatsApp',
  },
  {
    href: 'https://luma-manager.vercel.app/orders',
    icon: ShoppingBag,
    title: 'ניהול הזמנות',
    desc: 'צפייה וטיפול בהזמנות הלקוחות',
    external: true,
  },
]

export default function AdminDashboardPage() {
  return (
    <div className="max-w-4xl">
      {/* Heading */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-main">שלום, עדן כהן</h2>
        <p className="mt-1 text-sm text-text-muted">בחרו קטגוריה כדי להתחיל</p>
      </div>

      {/* Quick-link grid */}
      <ul
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        role="list"
        aria-label="קישורים מהירים"
      >
        {QUICK_LINKS.map(({ href, icon: Icon, title, desc, external }) => (
          <li key={href}>
            {external ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-3 bg-surface border border-border rounded-lg p-5 hover:border-primary hover:shadow-soft transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-primary">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <ArrowLeft
                    size={16}
                    className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-1"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="font-semibold text-text-main text-sm">{title}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </a>
            ) : (
              <Link
                href={href}
                className="group flex flex-col gap-3 bg-surface border border-border rounded-lg p-5 hover:border-primary hover:shadow-soft transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-primary">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <ArrowLeft
                    size={16}
                    className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-1"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="font-semibold text-text-main text-sm">{title}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
