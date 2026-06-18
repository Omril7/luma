import 'server-only'
import { prisma } from '@/server/prisma'
import { calculateProductPrice } from '@/server/services/pricingService'
import type { CreateOrderInput } from '@/shared/schemas'
import type { OrderDTO, ShippingAddressDTO } from '@/shared/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `LM-${datePart}-${randomPart}`
}

function toOrderDTO(order: any): OrderDTO {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress as ShippingAddressDTO,
    shippingMethod: order.shippingMethod,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    discount: Number(order.discount),
    total: Number(order.total),
    couponCode: order.couponCode ?? undefined,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    installments: order.installments ?? undefined,
    notes: order.notes ?? undefined,
    language: order.language,
    items: order.items.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      isCustom: item.isCustom,
      customWidth: item.customWidth ? Number(item.customWidth) : undefined,
      customHeight: item.customHeight ? Number(item.customHeight) : undefined,
      customDepth: item.customDepth ? Number(item.customDepth) : undefined,
      customDiameter: item.customDiameter ? Number(item.customDiameter) : undefined,
      selectedColorId: item.selectedColorId ?? undefined,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}

// ── Coupon validation ─────────────────────────────────────────────────────────

export interface CouponValidationResult {
  code: string
  discountAmount: number
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
}

export async function validateCoupon(
  code: string,
  subtotalNIS: number
): Promise<{ result: CouponValidationResult } | { error: string }> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  })

  if (!coupon) return { error: 'Coupon not found' }
  if (!coupon.isActive) return { error: 'Coupon is not active' }

  const now = new Date()

  if (coupon.validFrom && coupon.validFrom > now) {
    return { error: 'Coupon is not yet valid' }
  }

  if (coupon.validUntil && coupon.validUntil < now) {
    return { error: 'Coupon has expired' }
  }

  if (
    coupon.maxUses !== null &&
    coupon.maxUses !== undefined &&
    coupon.usedCount >= coupon.maxUses
  ) {
    return { error: 'Coupon has reached its maximum uses' }
  }

  const minOrderAmount = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0
  if (subtotalNIS < minOrderAmount) {
    return { error: `Minimum order amount is ₪${minOrderAmount}` }
  }

  const discountValue = Number(coupon.discountValue)
  let discountAmount: number

  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = Math.round(((subtotalNIS * discountValue) / 100) * 100) / 100
  } else {
    // FIXED_AMOUNT
    discountAmount = Math.min(discountValue, subtotalNIS)
  }

  return {
    result: {
      code: coupon.code,
      discountAmount,
      discountType: coupon.discountType,
      discountValue,
    },
  }
}

// ── Create order ──────────────────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<OrderDTO> {
  // 1. Validate + price every item
  type PricedItem = {
    productId: string
    variantId?: string
    isCustom: boolean
    customWidth?: number
    customHeight?: number
    customDepth?: number
    customDiameter?: number
    selectedColorId?: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }

  const pricedItems: PricedItem[] = []

  for (const item of input.items) {
    const calc = await calculateProductPrice(item.productId, {
      variantId: item.variantId,
      custom: item.isCustom
        ? {
            width: item.customWidth,
            height: item.customHeight,
            depth: item.customDepth,
            diameter: item.customDiameter,
          }
        : undefined,
      colorId: item.selectedColorId,
      quantity: item.quantity,
    })

    if (calc.error) {
      throw new Error(`Pricing error for product ${item.productId}: ${calc.error.message}`)
    }

    pricedItems.push({
      productId: item.productId,
      variantId: item.variantId,
      isCustom: item.isCustom,
      customWidth: item.customWidth,
      customHeight: item.customHeight,
      customDepth: item.customDepth,
      customDiameter: item.customDiameter,
      selectedColorId: item.selectedColorId,
      quantity: item.quantity,
      unitPrice: calc.result!.unitPriceDisplay,
      totalPrice: calc.result!.totalPriceDisplay,
    })
  }

  // 2. Compute order totals
  const subtotal = pricedItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const shippingCost = input.shippingMethod === 'NATIONAL_SHIPPING' ? 150 : 0

  // 3. Validate coupon if provided
  let discountAmount = 0
  let appliedCouponCode: string | undefined

  if (input.couponCode) {
    const couponResult = await validateCoupon(input.couponCode, subtotal)
    if ('result' in couponResult) {
      discountAmount = couponResult.result.discountAmount
      appliedCouponCode = couponResult.result.code
    }
    // If coupon validation fails we silently ignore it (best-effort; payment step re-validates)
  }

  const total = Math.max(0, subtotal + shippingCost - discountAmount)

  // 4. Persist order
  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      shippingAddress: input.shippingAddress,
      shippingMethod: input.shippingMethod,
      subtotal,
      shippingCost,
      discount: discountAmount,
      total,
      couponCode: appliedCouponCode,
      installments: input.installments,
      notes: input.notes,
      language: input.language,
      items: {
        create: pricedItems,
      },
    },
    include: { items: true },
  })

  // 5. Increment coupon usedCount if coupon was applied
  if (appliedCouponCode) {
    await prisma.coupon.update({
      where: { code: appliedCouponCode },
      data: { usedCount: { increment: 1 } },
    })
  }

  return toOrderDTO(order)
}

// ── Get order by ID ───────────────────────────────────────────────────────────

export async function getOrderById(id: string): Promise<OrderDTO | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!order) return null
  return toOrderDTO(order)
}
