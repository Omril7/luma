import { describe, it, expect } from 'vitest'
import { calculatePrice, PricingError } from './pricing'
import type { VariantTier, PricingRule } from './pricing'

// ── Test fixtures ─────────────────────────────────────────────────────────────

/** Three standard S/M/L variants (all prices in agorot) */
const variants: VariantTier[] = [
  { id: 'sm', width: 60, height: 40, depth: 30, price: 50_000 }, // ₪500
  { id: 'md', width: 80, height: 60, depth: 40, price: 80_000 }, // ₪800
  { id: 'lg', width: 100, height: 80, depth: 50, price: 120_000 }, // ₪1 200
]

const rule: PricingRule = {
  pricePerCmWidth: 500, // ₪5/cm
  pricePerCmHeight: 300, // ₪3/cm
  pricePerCmDepth: 200, // ₪2/cm
  minWidth: 30,
  maxWidth: 150,
  minHeight: 20,
  maxHeight: 120,
  minDepth: 20,
  maxDepth: 100,
}

const customizable = { customizable: true }
const nonCustomizable = { customizable: false }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calculatePrice — standard variant selection', () => {
  it('returns the exact variant price for an exact variantId match', () => {
    const result = calculatePrice(nonCustomizable, variants, null, { variantId: 'md' })
    expect(result.unitPrice).toBe(80_000)
    expect(result.totalPrice).toBe(80_000)
    expect(result.baseTierId).toBe('md')
    expect(result.surchargeBreakdown).toEqual({
      base: 80_000,
      width: 0,
      height: 0,
      depth: 0,
      diameter: 0,
    })
  })

  it('throws when variantId does not exist', () => {
    expect(() => calculatePrice(nonCustomizable, variants, null, { variantId: 'ghost' })).toThrow(
      'not found'
    )
  })

  it('multiplies unit price by quantity', () => {
    const result = calculatePrice(nonCustomizable, variants, null, { variantId: 'sm', quantity: 3 })
    expect(result.unitPrice).toBe(50_000)
    expect(result.totalPrice).toBe(150_000)
  })
})

describe('calculatePrice — custom dimensions: base tier selection', () => {
  it('uses the closest-but-smaller tier when custom fits within one tier', () => {
    // 90×70 — md (80×60) qualifies; lg (100×80) does not (100 > 90)
    const result = calculatePrice(customizable, variants, rule, {
      custom: { width: 90, height: 70 },
    })
    expect(result.baseTierId).toBe('md')
    // delta width = 90-80=10, surcharge = 10*500 = 5000
    // delta height = 70-60=10, surcharge = 10*300 = 3000
    expect(result.surchargeBreakdown.width).toBe(5_000)
    expect(result.surchargeBreakdown.height).toBe(3_000)
    expect(result.unitPrice).toBe(80_000 + 5_000 + 3_000) // 88 000
  })

  it('selects the correct base when custom falls between two tiers', () => {
    // 70×50 — sm (60×40) qualifies (60≤70, 40≤50); md (80×60) does not (80>70)
    const result = calculatePrice(customizable, variants, rule, {
      custom: { width: 70, height: 50 },
    })
    expect(result.baseTierId).toBe('sm')
    // delta width = 70-60=10 → 5000; delta height = 50-40=10 → 3000
    expect(result.unitPrice).toBe(50_000 + 5_000 + 3_000) // 58 000
  })

  it('falls back to the smallest tier when custom is smaller than all variants', () => {
    // 40×30 — no variant qualifies (sm.width=60 > 40)
    const result = calculatePrice(customizable, variants, rule, {
      custom: { width: 40, height: 30 },
    })
    expect(result.baseTierId).toBe('sm')
    // delta width = max(0, 40-60) = 0; delta height = max(0, 30-40) = 0
    expect(result.surchargeBreakdown.width).toBe(0)
    expect(result.surchargeBreakdown.height).toBe(0)
    expect(result.unitPrice).toBe(50_000) // no surcharge
  })
})

describe('calculatePrice — custom dimensions: surcharge math', () => {
  it('computes multi-axis surcharges and sums them correctly', () => {
    // 90×70×45 — md (80×60×40) qualifies
    const result = calculatePrice(customizable, variants, rule, {
      custom: { width: 90, height: 70, depth: 45 },
    })
    expect(result.baseTierId).toBe('md')
    // width: (90-80)*500=5000, height: (70-60)*300=3000, depth: (45-40)*200=1000
    expect(result.surchargeBreakdown.width).toBe(5_000)
    expect(result.surchargeBreakdown.height).toBe(3_000)
    expect(result.surchargeBreakdown.depth).toBe(1_000)
    expect(result.unitPrice).toBe(80_000 + 5_000 + 3_000 + 1_000) // 89 000
  })

  it('adds 0 for an axis with no per-cm rate configured', () => {
    const ruleNoHeight: PricingRule = { pricePerCmWidth: 500 } // no height rate
    // 90×70 — sm (60×40) qualifies (80 > 90 → md out; only sm: 60≤90, 40≤70)
    // Actually: md (80×60): 80≤90 and 60≤70 → md qualifies too. Pick largest = md.
    const result = calculatePrice(customizable, variants, ruleNoHeight, {
      custom: { width: 90, height: 70 },
    })
    expect(result.surchargeBreakdown.height).toBe(0)
    expect(result.surchargeBreakdown.width).toBe(5_000) // (90-80)*500
    expect(result.unitPrice).toBe(80_000 + 5_000) // 85 000
  })

  it('rounds the unit price to whole agorot after summing fractional surcharges', () => {
    // delta = 7.5 cm, rate = 333 agorot/cm → surcharge = 2497.5 → rounds to 2498
    const fractionalRule: PricingRule = { pricePerCmWidth: 333 }
    const simpleVariants: VariantTier[] = [{ id: 'base', width: 60, price: 50_000 }]
    const result = calculatePrice(customizable, simpleVariants, fractionalRule, {
      custom: { width: 67.5 },
    })
    // delta = 7.5, surcharge = 7.5 * 333 = 2497.5 → round → 2498
    expect(result.unitPrice).toBe(52_498)
    expect(Number.isInteger(result.unitPrice)).toBe(true)
  })

  it('quantity multiplies unit price (rounding happens before multiply)', () => {
    const result = calculatePrice(customizable, variants, rule, {
      custom: { width: 90 },
      quantity: 4,
    })
    const expectedUnit = 80_000 + (90 - 80) * 500 // 85 000
    expect(result.unitPrice).toBe(expectedUnit)
    expect(result.totalPrice).toBe(expectedUnit * 4)
  })
})

describe('calculatePrice — constraint validation', () => {
  it('throws PricingError when width exceeds maximum', () => {
    expect(() => calculatePrice(customizable, variants, rule, { custom: { width: 200 } })).toThrow(
      PricingError
    )

    try {
      calculatePrice(customizable, variants, rule, { custom: { width: 200 } })
    } catch (err) {
      expect(err).toBeInstanceOf(PricingError)
      const e = err as PricingError
      expect(e.dimension).toBe('width')
      expect(e.bound).toBe('max')
      expect(e.value).toBe(200)
      expect(e.limit).toBe(150)
    }
  })

  it('throws PricingError when height is below minimum', () => {
    try {
      calculatePrice(customizable, variants, rule, { custom: { height: 5 } })
    } catch (err) {
      expect(err).toBeInstanceOf(PricingError)
      const e = err as PricingError
      expect(e.dimension).toBe('height')
      expect(e.bound).toBe('min')
      expect(e.value).toBe(5)
      expect(e.limit).toBe(20)
    }
  })

  it('throws when product is not customizable', () => {
    expect(() =>
      calculatePrice(nonCustomizable, variants, rule, { custom: { width: 90 } })
    ).toThrow('not customizable')
  })

  it('throws when customizable product has no pricing rule', () => {
    expect(() => calculatePrice(customizable, variants, null, { custom: { width: 90 } })).toThrow(
      'no pricing rule'
    )
  })
})

describe('calculatePrice — parity (browser/server drift guard)', () => {
  it('returns identical output for the same inputs on repeated calls', () => {
    const opts = { custom: { width: 85, height: 65, depth: 45 }, quantity: 2 }
    const r1 = calculatePrice(customizable, variants, rule, opts)
    const r2 = calculatePrice(customizable, variants, rule, opts)
    expect(r1).toEqual(r2)
  })

  it('does not mutate the variants array', () => {
    const copy = JSON.stringify(variants)
    calculatePrice(customizable, variants, rule, { custom: { width: 90 } })
    expect(JSON.stringify(variants)).toBe(copy)
  })
})

describe('calculatePrice — explicit basedOnVariantId', () => {
  it('uses the specified base tier regardless of dimension fit', () => {
    // Normally 90×70 would select md, but if rule.basedOnVariantId = 'sm', use sm
    const ruleWithBase: PricingRule = { ...rule, basedOnVariantId: 'sm' }
    const result = calculatePrice(customizable, variants, ruleWithBase, {
      custom: { width: 90, height: 70 },
    })
    expect(result.baseTierId).toBe('sm')
    // delta width = 90-60=30, 30*500=15000; delta height = 70-40=30, 30*300=9000
    expect(result.surchargeBreakdown.width).toBe(15_000)
    expect(result.surchargeBreakdown.height).toBe(9_000)
    expect(result.unitPrice).toBe(50_000 + 15_000 + 9_000) // 74 000
  })
})
