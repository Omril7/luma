import { type Metadata } from 'next'
import { CouponFormPage } from '@/features/admin/coupons/CouponFormPage'

export const metadata: Metadata = { title: 'קופון חדש — Luma ניהול' }

export default function NewCouponPage() {
  return <CouponFormPage />
}
