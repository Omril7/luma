import { type Metadata } from 'next'
import { PriceOffersListPage } from '@/features/admin/price-offers/PriceOffersListPage'

export const metadata: Metadata = { title: 'הצעות מחיר — Luma ניהול' }

export default function AdminPriceOffersPage() {
  return <PriceOffersListPage />
}
