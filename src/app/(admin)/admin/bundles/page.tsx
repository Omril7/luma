import { type Metadata } from 'next'
import { PackageOpen } from 'lucide-react'

export const metadata: Metadata = { title: 'חבילות — Luma ניהול' }

export default function AdminBundlesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-text-main">חבילות</h2>
        <p className="text-sm text-text-muted mt-0.5">ניהול חבילות מוצרים במחיר מיוחד</p>
      </div>
      <div className="bg-surface border border-border rounded-lg p-12 flex flex-col items-center gap-4 text-center">
        <PackageOpen size={40} className="text-text-muted" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold text-text-main">בקרוב</p>
          <p className="text-sm text-text-muted mt-1 max-w-sm">
            ניהול חבילות מוצרים יתווסף בשלב הבא של הפיתוח.
          </p>
        </div>
      </div>
    </div>
  )
}
