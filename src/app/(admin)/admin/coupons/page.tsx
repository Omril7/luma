import { type Metadata } from 'next'
import { CouponsListPage } from '@/features/admin/coupons/CouponsListPage'

export const metadata: Metadata = { title: 'קופונים — Luma ניהול' }

export default function AdminCouponsPage() {
  return <CouponsListPage />
}
