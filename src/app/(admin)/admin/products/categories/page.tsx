import { type Metadata } from 'next'
import { CategoriesListPage } from '@/features/admin/products/CategoriesListPage'

export const metadata: Metadata = { title: 'קטגוריות — Luma ניהול' }

export default function AdminCategoriesPage() {
  return <CategoriesListPage />
}
