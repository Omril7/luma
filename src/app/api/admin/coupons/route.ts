import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse } from '@/server/http'
import { createCouponSchema, type CreateCouponInput } from '@/shared/schemas'
import { listAdminCoupons, createAdminCoupon } from '@/server/services/adminCouponService'

export const GET = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '25', 10)
  const search = searchParams.get('search') ?? undefined
  const isActiveParam = searchParams.get('isActive')
  const isActive = isActiveParam === null ? undefined : isActiveParam === 'true'

  const result = await listAdminCoupons({ page, pageSize, search, isActive })
  return NextResponse.json(result)
})

export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, createCouponSchema)
  if (body instanceof NextResponse) return body

  try {
    const coupon = await createAdminCoupon(body as CreateCouponInput)
    return NextResponse.json({ coupon }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return errorResponse('A coupon with this code already exists', 409)
    }
    throw err
  }
})
