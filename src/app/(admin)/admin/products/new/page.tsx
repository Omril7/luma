import { type Metadata } from 'next'
import { ProductFormPage } from '@/features/admin/products/ProductFormPage'

export const metadata: Metadata = { title: 'מוצר חדש — Luma ניהול' }

export default function NewProductPage() {
  return <ProductFormPage mode="create" />
}
