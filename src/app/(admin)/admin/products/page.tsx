import { type Metadata } from 'next'
import { ProductsListPage } from '@/features/admin/products/ProductsListPage'

export const metadata: Metadata = { title: 'מוצרים — Luma ניהול' }

export default function AdminProductsPage() {
  return <ProductsListPage />
}
