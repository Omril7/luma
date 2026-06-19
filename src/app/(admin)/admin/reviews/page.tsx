import { type Metadata } from 'next'
import { Star } from 'lucide-react'

export const metadata: Metadata = { title: 'ביקורות — Luma ניהול' }

export default function AdminReviewsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-text-main">ביקורות</h2>
        <p className="text-sm text-text-muted mt-0.5">אישור ופרסום ביקורות לקוחות</p>
      </div>
      <div className="bg-surface border border-border rounded-lg p-12 flex flex-col items-center gap-4 text-center">
        <Star size={40} className="text-text-muted" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold text-text-main">בקרוב</p>
          <p className="text-sm text-text-muted mt-1 max-w-sm">
            ניהול ביקורות לקוחות יתווסף בשלב הבא של הפיתוח.
          </p>
        </div>
      </div>
    </div>
  )
}
