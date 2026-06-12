// Framework-free shared DTO types — used by both UI and API route handlers
// No React, Next.js, or Prisma imports allowed in this file.

import type {
  Category,
  ShippingMethod,
  PaymentStatus,
  OrderStatus,
  DiscountType,
  Locale,
} from './constants'

// ── Bilingual helpers ────────────────────────────────────────────────────────

export interface Bilingual {
  he: string
  en: string
}

// ── Product DTOs ──────────────────────────────────────────────────────────────

export interface ProductVariantDTO {
  id: string
  name_he: string
  name_en: string
  width?: number
  height?: number
  depth?: number
  diameter?: number
  price: number // decimal (₪)
  sku: string
  isActive: boolean
}

export interface CustomPricingRuleDTO {
  id: string
  basedOnVariantId?: string
  pricePerCmWidth?: number
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

export interface ProductImageDTO {
  id: string
  url: string
  altText_he: string
  altText_en: string
  sortOrder: number
  isPrimary: boolean
}

export interface ColorOptionDTO {
  id: string
  name_he: string
  name_en: string
  hexCode: string
  imageUrl?: string
}

export interface ProductDTO {
  id: string
  slug: string
  name_he: string
  name_en: string
  description_he: string
  description_en: string
  category: Category
  basePrice: number // decimal (₪)
  customizable: boolean
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  images: ProductImageDTO[]
  variants: ProductVariantDTO[]
  customPricingRule?: CustomPricingRuleDTO
  colorOptions: ColorOptionDTO[]
  createdAt: string
  updatedAt: string
}

// ── Order DTOs ────────────────────────────────────────────────────────────────

export interface ShippingAddressDTO {
  street: string
  city: string
  state?: string
  postalCode?: string
  country: string
  notes?: string
}

export interface OrderItemDTO {
  id: string
  productId: string
  variantId?: string
  isCustom: boolean
  customWidth?: number
  customHeight?: number
  customDepth?: number
  customDiameter?: number
  selectedColorId?: string
  quantity: number
  unitPrice: number // decimal (₪)
  totalPrice: number // decimal (₪)
}

export interface OrderDTO {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: ShippingAddressDTO
  shippingMethod: ShippingMethod
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  couponCode?: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  installments?: number
  notes?: string
  language: Locale
  items: OrderItemDTO[]
  createdAt: string
  updatedAt: string
}

// ── Coupon DTO ────────────────────────────────────────────────────────────────

export interface CouponDTO {
  id: string
  code: string
  discountType: DiscountType
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  usedCount: number
  validFrom?: string
  validUntil?: string
  isActive: boolean
  singleUsePerCustomer: boolean
  firstOrderOnly: boolean
  autoApply: boolean
}

// ── Pricing (shared between UI price preview and API validation) ──────────────

export interface PriceRequestDTO {
  productId: string
  variantId?: string
  custom?: {
    width?: number
    height?: number
    depth?: number
    diameter?: number
  }
  colorId?: string
  quantity?: number
}

export interface PriceResponseDTO {
  unitPrice: number // agorot
  totalPrice: number // agorot
  unitPriceDisplay: number // decimal ₪ for display
  totalPriceDisplay: number // decimal ₪ for display
  baseTierId?: string
  surchargeBreakdown: {
    base: number
    width: number
    height: number
    depth: number
    diameter: number
  }
}
