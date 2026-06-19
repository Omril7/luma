import { NextResponse } from 'next/server'
import { withAdmin, errorResponse, type AdminPayload } from '@/server/http'
import { getAdminCouponById, toggleAdminCoupon } from '@/server/services/adminCouponService'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params
  const existing = await getAdminCouponById(id)
  if (!existing) return errorResponse('Coupon not found', 404)

  const coupon = await toggleAdminCoupon(id)
  return NextResponse.json({ coupon })
})
