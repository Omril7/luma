// Framework-free constants — safe to import in browser AND server

export const LOCALES = ['he', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const LOCALE_DEFAULT: Locale = 'he'

export const SHIPPING_METHOD = {
  NATIONAL_SHIPPING: 'NATIONAL_SHIPPING',
  PICKUP: 'PICKUP',
} as const
export type ShippingMethod = keyof typeof SHIPPING_METHOD

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const
export type PaymentStatus = keyof typeof PAYMENT_STATUS

export const ORDER_STATUS = {
  RECEIVED: 'RECEIVED',
  IN_PRODUCTION: 'IN_PRODUCTION',
  READY: 'READY',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const
export type OrderStatus = keyof typeof ORDER_STATUS

export const DISCOUNT_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
} as const
export type DiscountType = keyof typeof DISCOUNT_TYPE

export const CURRENCY = 'ILS'

/** Agorot per ₪ (100 agorot = 1 shekel). Use for money conversions. */
export const AGOROT_PER_SHEKEL = 100
