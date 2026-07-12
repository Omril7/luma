import { type Metadata } from 'next'
import { ReviewsListPage } from '@/features/admin/reviews/ReviewsListPage'

export const metadata: Metadata = { title: 'ביקורות — Luma ניהול' }

export default function AdminReviewsPage() {
  return <ReviewsListPage />
}
