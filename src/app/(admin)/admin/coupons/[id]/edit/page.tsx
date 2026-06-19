import { type Metadata } from 'next'
import { CouponFormPage } from '@/features/admin/coupons/CouponFormPage'

export const metadata: Metadata = { title: 'עריכת קופון — Luma ניהול' }

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CouponFormPage couponId={id} />
}
