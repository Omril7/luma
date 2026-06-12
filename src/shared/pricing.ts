// Framework-free pricing engine — SINGLE SOURCE OF TRUTH.
// Imported by client components (live preview) and API route handlers (validation).
// No React, Next.js, Prisma, or Node-only imports allowed.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VariantTier {
  id: string
  width?: number
  height?: number
  depth?: number
  diameter?: number
  price: number // integer agorot
}

export interface PricingRule {
  basedOnVariantId?: string
  pricePerCmWidth?: number // agorot per cm
  pricePerCmHeight?: number
  pricePerCmDepth?: number
  pricePerCmDiameter?: number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  minDepth?: number
  maxDepth?: number
}

export interface PriceOptions {
  variantId?: string
  custom?: {
    width?: number
    height?: number
    depth?: number
    diameter?: number
  }
  colorId?: string // reserved — color surcharge is future; currently 0
  quantity?: number // default 1
}

export interface PriceResult {
  unitPrice: number // integer agorot
  totalPrice: number // integer agorot
  baseTierId?: string
  surchargeBreakdown: {
    base: number
    width: number
    height: number
    depth: number
    diameter: number
  }
}

// ── Errors ────────────────────────────────────────────────────────────────────

export class PricingError extends Error {
  constructor(
    message: string,
    public readonly dimension: string,
    public readonly bound: 'min' | 'max',
    public readonly value: number,
    public readonly limit: number
  ) {
    super(message)
    this.name = 'PricingError'
  }
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Calculate the unit and total price for a product.
 *
 * All money values are integer agorot (₪1 = 100 agorot).
 * Convert to/from Decimal ₪ at DB and display boundaries only.
 */
export function calculatePrice(
  product: { customizable: boolean },
  variants: VariantTier[],
  rule: PricingRule | null,
  options: PriceOptions
): PriceResult {
  const qty = options.quantity ?? 1
  if (qty < 1) throw new Error('Quantity must be at least 1')

  // ── Step 1: Standard variant selection ──────────────────────────────────────
  if (options.variantId !== undefined) {
    const variant = variants.find((v) => v.id === options.variantId)
    if (!variant) throw new Error(`Variant "${options.variantId}" not found`)

    const unitPrice = variant.price
    const totalPrice = unitPrice * qty

    return {
      unitPrice,
      totalPrice,
      baseTierId: variant.id,
      surchargeBreakdown: { base: unitPrice, width: 0, height: 0, depth: 0, diameter: 0 },
    }
  }

  // ── Step 2: Custom dimensions ───────────────────────────────────────────────
  if (!product.customizable) {
    throw new Error('Product is not customizable — provide a variantId instead')
  }
  if (!rule) {
    throw new Error('Customizable product has no pricing rule configured')
  }
  if (!options.custom) {
    throw new Error('Custom dimensions are required for custom pricing')
  }

  const { custom } = options

  // 2a. Validate dimensions against rule constraints
  const constraints = [
    { key: 'width', val: custom.width, min: rule.minWidth, max: rule.maxWidth },
    { key: 'height', val: custom.height, min: rule.minHeight, max: rule.maxHeight },
    { key: 'depth', val: custom.depth, min: rule.minDepth, max: rule.maxDepth },
  ] as const

  for (const { key, val, min, max } of constraints) {
    if (val === undefined) continue
    if (min !== undefined && val < min) {
      throw new PricingError(
        `${key} ${val} cm is below the minimum of ${min} cm`,
        key,
        'min',
        val,
        min
      )
    }
    if (max !== undefined && val > max) {
      throw new PricingError(
        `${key} ${val} cm exceeds the maximum of ${max} cm`,
        key,
        'max',
        val,
        max
      )
    }
  }

  // 2b. Pick base tier
  const baseTier = selectBaseTier(variants, custom, rule.basedOnVariantId)

  // 2c-d. Calculate per-axis surcharges (only upcharge for growth beyond base)
  const surchargeWidth = dimensionSurcharge(custom.width, baseTier.width, rule.pricePerCmWidth)
  const surchargeHeight = dimensionSurcharge(custom.height, baseTier.height, rule.pricePerCmHeight)
  const surchargeDepth = dimensionSurcharge(custom.depth, baseTier.depth, rule.pricePerCmDepth)
  const surchargeDiameter = dimensionSurcharge(
    custom.diameter,
    baseTier.diameter,
    rule.pricePerCmDiameter
  )

  // Step 3: Color surcharge — reserved, currently 0
  const colorSurcharge = 0

  // Step 4: Round once to whole agorot, then multiply by quantity
  const unitPrice = Math.round(
    baseTier.price +
      surchargeWidth +
      surchargeHeight +
      surchargeDepth +
      surchargeDiameter +
      colorSurcharge
  )
  const totalPrice = unitPrice * qty

  return {
    unitPrice,
    totalPrice,
    baseTierId: baseTier.id,
    surchargeBreakdown: {
      base: baseTier.price,
      width: surchargeWidth,
      height: surchargeHeight,
      depth: surchargeDepth,
      diameter: surchargeDiameter,
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Select the "closest-but-smaller" base tier:
 * The largest (most expensive) variant whose every defined dimension is ≤ the requested
 * dimension. If none qualifies (request is smaller than the smallest variant), use the
 * smallest variant as the floor — delta is always floored at 0 so price never goes below base.
 *
 * If basedOnVariantId is explicitly configured, that variant is used unconditionally.
 */
function selectBaseTier(
  variants: VariantTier[],
  custom: NonNullable<PriceOptions['custom']>,
  basedOnVariantId?: string
): VariantTier {
  if (variants.length === 0) throw new Error('Product has no variants')

  if (basedOnVariantId) {
    const explicit = variants.find((v) => v.id === basedOnVariantId)
    if (explicit) return explicit
  }

  // Sort ascending by price so the last qualifying entry is the largest/most-expensive tier
  const sorted = [...variants].sort((a, b) => a.price - b.price)

  const qualifying = sorted.filter((v) => {
    if (custom.width !== undefined && v.width !== undefined && v.width > custom.width) return false
    if (custom.height !== undefined && v.height !== undefined && v.height > custom.height)
      return false
    if (custom.depth !== undefined && v.depth !== undefined && v.depth > custom.depth) return false
    if (custom.diameter !== undefined && v.diameter !== undefined && v.diameter > custom.diameter)
      return false
    return true
  })

  // If nothing qualifies, request is smaller than smallest tier — use smallest as floor
  return qualifying.length > 0 ? qualifying[qualifying.length - 1] : sorted[0]
}

/**
 * Compute the upcharge for a single dimension.
 * delta = max(0, customDim - baseDim)  — never negative
 * surcharge = delta * ratePerCm
 * Returns 0 if any argument is undefined (dimension not applicable or rate not configured).
 */
function dimensionSurcharge(
  customDim: number | undefined,
  baseDim: number | undefined,
  ratePerCm: number | undefined
): number {
  if (customDim === undefined || baseDim === undefined || ratePerCm === undefined) return 0
  const delta = Math.max(0, customDim - baseDim)
  return delta * ratePerCm
}
