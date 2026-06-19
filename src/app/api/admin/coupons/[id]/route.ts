import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse, type AdminPayload } from '@/server/http'
import { updateCouponSchema } from '@/shared/schemas'
import {
  getAdminCouponById,
  updateAdminCoupon,
  deleteAdminCoupon,
} from '@/server/services/adminCouponService'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params
  const coupon = await getAdminCouponById(id)
  if (!coupon) return errorResponse('Coupon not found', 404)
  return NextResponse.json({ coupon })
})

export const PATCH = withAdmin<Ctx>(async (req: NextRequest, _admin: AdminPayload, { params }) => {
  const { id } = await params
  const existing = await getAdminCouponById(id)
  if (!existing) return errorResponse('Coupon not found', 404)

  const body = await parseBody(req, updateCouponSchema)
  if (body instanceof NextResponse) return body

  try {
    const coupon = await updateAdminCoupon(id, body)
    return NextResponse.json({ coupon })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return errorResponse('A coupon with this code already exists', 409)
    }
    throw err
  }
})

export const DELETE = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params
  const existing = await getAdminCouponById(id)
  if (!existing) return errorResponse('Coupon not found', 404)

  await deleteAdminCoupon(id)
  return NextResponse.json({ success: true })
})
