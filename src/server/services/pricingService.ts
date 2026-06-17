import 'server-only'
import { calculatePrice, PricingError, type PricingRule, type VariantTier } from '@/shared/pricing'
import type { PriceOptions, PriceResult } from '@/shared/pricing'
import type { PriceResponseDTO } from '@/shared/types'
import { getProductById } from './productService'

// ── Decimal conversion ────────────────────────────────────────────────────────
// DB stores money in ₪ (Decimal). Pricing engine uses integer agorot.
// Rate fields (pricePerCm*) are also stored in ₪/cm.

function shekelToAgorot(shekel: number): number {
  return Math.round(shekel * 100)
}

// ── Price calculation ─────────────────────────────────────────────────────────

export interface PriceCalcOptions {
  variantId?: string
  custom?: { width?: number; height?: number; depth?: number; diameter?: number }
  colorId?: string
  quantity?: number
}

export interface PriceCalcResult {
  result?: PriceResponseDTO
  error?: {
    type: 'not_found' | 'dimension_out_of_bounds' | 'invalid_request'
    message: string
    dimension?: string
    bound?: 'min' | 'max'
    value?: number
    limit?: number
  }
}

export async function calculateProductPrice(
  productId: string,
  options: PriceCalcOptions
): Promise<PriceCalcResult> {
  const product = await getProductById(productId)
  if (!product) {
    return { error: { type: 'not_found', message: 'Product not found' } }
  }

  const variantTiers: VariantTier[] = product.variants.map((v) => ({
    id: v.id,
    width: v.width,
    height: v.height,
    depth: v.depth,
    diameter: v.diameter,
    price: shekelToAgorot(v.price),
  }))

  const rule: PricingRule | null = product.customPricingRule
    ? {
        basedOnVariantId: product.customPricingRule.basedOnVariantId,
        pricePerCmWidth:
          product.customPricingRule.pricePerCmWidth !== undefined
            ? shekelToAgorot(product.customPricingRule.pricePerCmWidth)
            : undefined,
        pricePerCmHeight:
          product.customPricingRule.pricePerCmHeight !== undefined
            ? shekelToAgorot(product.customPricingRule.pricePerCmHeight)
            : undefined,
        pricePerCmDepth:
          product.customPricingRule.pricePerCmDepth !== undefined
            ? shekelToAgorot(product.customPricingRule.pricePerCmDepth)
            : undefined,
        pricePerCmDiameter:
          product.customPricingRule.pricePerCmDiameter !== undefined
            ? shekelToAgorot(product.customPricingRule.pricePerCmDiameter)
            : undefined,
        minWidth: product.customPricingRule.minWidth,
        maxWidth: product.customPricingRule.maxWidth,
        minHeight: product.customPricingRule.minHeight,
        maxHeight: product.customPricingRule.maxHeight,
        minDepth: product.customPricingRule.minDepth,
        maxDepth: product.customPricingRule.maxDepth,
      }
    : null

  const priceOptions: PriceOptions = {
    variantId: options.variantId,
    custom: options.custom,
    colorId: options.colorId,
    quantity: options.quantity,
  }

  try {
    const raw: PriceResult = calculatePrice(
      { customizable: product.customizable },
      variantTiers,
      rule,
      priceOptions
    )

    const dto: PriceResponseDTO = {
      unitPrice: raw.unitPrice,
      totalPrice: raw.totalPrice,
      unitPriceDisplay: raw.unitPrice / 100,
      totalPriceDisplay: raw.totalPrice / 100,
      baseTierId: raw.baseTierId,
      surchargeBreakdown: raw.surchargeBreakdown,
    }

    return { result: dto }
  } catch (err) {
    if (err instanceof PricingError) {
      return {
        error: {
          type: 'dimension_out_of_bounds',
          message: err.message,
          dimension: err.dimension,
          bound: err.bound,
          value: err.value,
          limit: err.limit,
        },
      }
    }
    if (err instanceof Error) {
      return { error: { type: 'invalid_request', message: err.message } }
    }
    return { error: { type: 'invalid_request', message: 'Unknown pricing error' } }
  }
}
