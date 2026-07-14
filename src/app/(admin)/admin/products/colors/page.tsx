import { type Metadata } from 'next'
import { ColorsListPage } from '@/features/admin/products/ColorsListPage'

export const metadata: Metadata = { title: 'צבעים — Luma ניהול' }

export default function AdminColorsPage() {
  return <ColorsListPage />
}
