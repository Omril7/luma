import { type Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ADMIN_NAV_ITEMS } from '@/features/admin/adminNav'

export const metadata: Metadata = { title: 'לוח בקרה — Luma ניהול' }

// Every admin section except the dashboard itself (no point linking to the page you're on).
const QUICK_LINKS = ADMIN_NAV_ITEMS.filter((item) => item.href !== '/admin')

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
        {QUICK_LINKS.map(({ href, icon: Icon, label: title, desc, external, comingSoon }) => (
          <li key={href}>
            {comingSoon ? (
              <div
                aria-disabled="true"
                className="flex flex-col gap-3 bg-surface border border-dashed border-border rounded-lg p-5 cursor-not-allowed select-none"
              >
                <div className="flex items-start justify-between">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-text-muted">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-semibold text-text-muted bg-secondary px-2 py-0.5 rounded-full border border-border mt-1">
                    בקרוב
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-text-muted text-sm">{title}</p>
                  <p className="text-xs text-text-muted/70 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ) : external ? (
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
