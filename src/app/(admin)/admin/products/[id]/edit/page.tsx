import { type Metadata } from 'next'
import { ProductFormPage } from '@/features/admin/products/ProductFormPage'

export const metadata: Metadata = { title: 'עריכת מוצר — Luma ניהול' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductFormPage mode="edit" productId={id} />
}
