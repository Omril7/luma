import 'server-only'
import { Prisma, type DiscountType } from '@prisma/client'
import { prisma } from '@/server/prisma'
import type { CouponDTO } from '@/shared/types'
import type { CreateCouponInput } from '@/shared/schemas'

// ── DTO mapper ────────────────────────────────────────────────────────────────

function toCouponDTO(c: {
  id: string
  code: string
  discountType: DiscountType
  discountValue: Prisma.Decimal
  minOrderAmount: Prisma.Decimal | null
  maxUses: number | null
  usedCount: number
  validFrom: Date | null
  validUntil: Date | null
  isActive: boolean
  singleUsePerCustomer: boolean
  firstOrderOnly: boolean
  autoApply: boolean
}): CouponDTO {
  return {
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    discountValue: Number(c.discountValue),
    minOrderAmount: c.minOrderAmount !== null ? Number(c.minOrderAmount) : undefined,
    maxUses: c.maxUses ?? undefined,
    usedCount: c.usedCount,
    validFrom: c.validFrom?.toISOString(),
    validUntil: c.validUntil?.toISOString(),
    isActive: c.isActive,
    singleUsePerCustomer: c.singleUsePerCustomer,
    firstOrderOnly: c.firstOrderOnly,
    autoApply: c.autoApply,
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

export interface ListCouponsOptions {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}

export async function listAdminCoupons(opts: ListCouponsOptions = {}) {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25))
  const skip = (page - 1) * pageSize

  const where: Prisma.CouponWhereInput = {
    ...(opts.isActive !== undefined ? { isActive: opts.isActive } : {}),
    ...(opts.search ? { code: { contains: opts.search, mode: 'insensitive' as const } } : {}),
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { code: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.coupon.count({ where }),
  ])

  return { data: coupons.map(toCouponDTO), total, page, pageSize }
}

// ── Get single ────────────────────────────────────────────────────────────────

export async function getAdminCouponById(id: string): Promise<CouponDTO | null> {
  const c = await prisma.coupon.findUnique({ where: { id } })
  return c ? toCouponDTO(c) : null
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createAdminCoupon(data: CreateCouponInput): Promise<CouponDTO> {
  const created = await prisma.coupon.create({
    data: {
      code: data.code,
      discountType: data.discountType as DiscountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount ?? null,
      maxUses: data.maxUses ?? null,
      validFrom: data.validFrom ?? null,
      validUntil: data.validUntil ?? null,
      isActive: data.isActive,
      singleUsePerCustomer: data.singleUsePerCustomer,
      firstOrderOnly: data.firstOrderOnly,
      autoApply: data.autoApply,
    },
  })
  return toCouponDTO(created)
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateAdminCoupon(
  id: string,
  data: Partial<CreateCouponInput>
): Promise<CouponDTO> {
  const updated = await prisma.coupon.update({
    where: { id },
    data: {
      ...(data.code !== undefined ? { code: data.code } : {}),
      ...(data.discountType !== undefined
        ? { discountType: data.discountType as DiscountType }
        : {}),
      ...(data.discountValue !== undefined ? { discountValue: data.discountValue } : {}),
      ...(data.minOrderAmount !== undefined ? { minOrderAmount: data.minOrderAmount } : {}),
      ...(data.maxUses !== undefined ? { maxUses: data.maxUses } : {}),
      ...(data.validFrom !== undefined ? { validFrom: data.validFrom } : {}),
      ...(data.validUntil !== undefined ? { validUntil: data.validUntil } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.singleUsePerCustomer !== undefined
        ? { singleUsePerCustomer: data.singleUsePerCustomer }
        : {}),
      ...(data.firstOrderOnly !== undefined ? { firstOrderOnly: data.firstOrderOnly } : {}),
      ...(data.autoApply !== undefined ? { autoApply: data.autoApply } : {}),
    },
  })
  return toCouponDTO(updated)
}

// ── Soft delete ───────────────────────────────────────────────────────────────

export async function deleteAdminCoupon(id: string): Promise<void> {
  await prisma.coupon.update({ where: { id }, data: { isActive: false } })
}

// ── Toggle active ─────────────────────────────────────────────────────────────

export async function toggleAdminCoupon(id: string): Promise<CouponDTO> {
  const current = await prisma.coupon.findUniqueOrThrow({ where: { id } })
  const updated = await prisma.coupon.update({
    where: { id },
    data: { isActive: !current.isActive },
  })
  return toCouponDTO(updated)
}
