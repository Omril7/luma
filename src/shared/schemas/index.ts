// Zod validation schemas — framework-free, used by client forms AND route handlers.
// Same schema validates on both sides: if it diverges, user sees one result and server sees another.

import { z } from 'zod'

// ── Primitives ────────────────────────────────────────────────────────────────

const positiveDecimal = z.number().positive()
const nonNegativeDecimal = z.number().min(0)
const positiveDimension = z.number().positive().max(500) // cm, sanity upper bound

// ── Auth ──────────────────────────────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export type AdminLoginInput = z.infer<typeof adminLoginSchema>

// ── Price request ─────────────────────────────────────────────────────────────

export const priceRequestSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  custom: z
    .object({
      width: positiveDimension.optional(),
      height: positiveDimension.optional(),
      depth: positiveDimension.optional(),
      diameter: positiveDimension.optional(),
    })
    .optional(),
  colorId: z.string().cuid().optional(),
  quantity: z.number().int().min(1).max(100).default(1),
})

export type PriceRequestInput = z.infer<typeof priceRequestSchema>

// ── Shipping address ──────────────────────────────────────────────────────────

export const shippingAddressSchema = z.object({
  street: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().min(2).max(100).default('Israel'),
  notes: z.string().max(500).optional(),
})

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>

// ── Order item ────────────────────────────────────────────────────────────────

export const orderItemSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional(),
  isCustom: z.boolean(),
  customWidth: positiveDimension.optional(),
  customHeight: positiveDimension.optional(),
  customDepth: positiveDimension.optional(),
  customDiameter: positiveDimension.optional(),
  selectedColorId: z.string().cuid().optional(),
  quantity: z.number().int().min(1).max(100),
})

export type OrderItemInput = z.infer<typeof orderItemSchema>

// ── Create order ──────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  customerName: z.string().min(2).max(200),
  customerEmail: z.string().email(),
  customerPhone: z
    .string()
    .min(9)
    .max(20)
    .regex(/^[\d+\-\s()]+$/, 'Invalid phone number'),
  shippingAddress: shippingAddressSchema,
  shippingMethod: z.enum(['NATIONAL_SHIPPING', 'PICKUP']),
  couponCode: z.string().max(50).optional(),
  installments: z.number().int().min(1).max(36).optional(),
  notes: z.string().max(1000).optional(),
  language: z.enum(['he', 'en']).default('he'),
  items: z.array(orderItemSchema).min(1).max(50),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

// ── Contact form ──────────────────────────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  subject: z.string().min(2).max(200),
  message: z.string().min(10).max(2000),
  language: z.enum(['he', 'en']).default('he'),
  subscribeToNewsletter: z.boolean().optional(),
})

export type ContactInput = z.infer<typeof contactSchema>

// ── Newsletter subscribe ──────────────────────────────────────────────────────

export const newsletterSubscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  language: z.enum(['he', 'en']).default('he'),
})

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>

// ── Coupon ────────────────────────────────────────────────────────────────────

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, digits, hyphens, or underscores'),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: positiveDecimal,
  minOrderAmount: nonNegativeDecimal.optional(),
  maxUses: z.number().int().positive().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
  singleUsePerCustomer: z.boolean().default(false),
  firstOrderOnly: z.boolean().default(false),
  autoApply: z.boolean().default(false),
})

export type CreateCouponInput = z.infer<typeof createCouponSchema>

// ── Product admin ─────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, digits, and hyphens'),
  name_he: z.string().min(2).max(200),
  name_en: z.string().min(2).max(200),
  description_he: z.string().min(10).max(5000),
  description_en: z.string().min(10).max(5000),
  categoryId: z.string().min(1),
  basePrice: positiveDecimal,
  customizable: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

export const createVariantSchema = z.object({
  name_he: z.string().min(1).max(50),
  name_en: z.string().min(1).max(50),
  width: positiveDimension.optional(),
  height: positiveDimension.optional(),
  depth: positiveDimension.optional(),
  diameter: positiveDimension.optional(),
  price: positiveDecimal,
  sku: z.string().min(2).max(100),
  isActive: z.boolean().default(true),
})

export type CreateVariantInput = z.infer<typeof createVariantSchema>

export const customPricingRuleSchema = z.object({
  basedOnVariantId: z.string().cuid().optional(),
  pricePerCmWidth: nonNegativeDecimal.optional(),
  pricePerCmHeight: nonNegativeDecimal.optional(),
  pricePerCmDepth: nonNegativeDecimal.optional(),
  pricePerCmDiameter: nonNegativeDecimal.optional(),
  minWidth: positiveDimension.optional(),
  maxWidth: positiveDimension.optional(),
  minHeight: positiveDimension.optional(),
  maxHeight: positiveDimension.optional(),
  minDepth: positiveDimension.optional(),
  maxDepth: positiveDimension.optional(),
})

export type CustomPricingRuleInput = z.infer<typeof customPricingRuleSchema>

// ── Apply coupon ──────────────────────────────────────────────────────────────

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50),
  orderTotal: positiveDecimal,
  customerEmail: z.string().email(),
})

export type ApplyCouponInput = z.infer<typeof applyCouponSchema>

// ── Update coupon (partial) ───────────────────────────────────────────────────

export const updateCouponSchema = createCouponSchema.partial()
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>

// ── Category admin ────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name_he: z.string().min(1).max(100),
  name_en: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

export const updateCategorySchema = createCategorySchema.partial()
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

// ── Color admin ───────────────────────────────────────────────────────────────

export const createColorSchema = z.object({
  name_he: z.string().min(1).max(100),
  name_en: z.string().min(1).max(100),
  hexCode: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
})

export type CreateColorInput = z.infer<typeof createColorSchema>

export const updateColorSchema = createColorSchema.partial()
export type UpdateColorInput = z.infer<typeof updateColorSchema>

// ── Email settings ────────────────────────────────────────────────────────────

export const updateEmailSettingsSchema = z.object({
  fromAddress: z.string().email(),
  fromName_he: z.string().min(1).max(200),
  fromName_en: z.string().min(1).max(200),
  replyTo: z.string().email().optional(),
})

export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>

// ── Newsletter send ───────────────────────────────────────────────────────────

export const sendNewsletterSchema = z.object({
  subject_he: z.string().min(1).max(500),
  subject_en: z.string().min(1).max(500),
  body_he: z.string().min(1),
  body_en: z.string().min(1),
  targetLanguage: z.enum(['he', 'en']).optional(),
})

export type SendNewsletterInput = z.infer<typeof sendNewsletterSchema>

// ── Gallery image ─────────────────────────────────────────────────────────────

export const createGalleryImageSchema = z.object({
  url: z.string().url(),
  // Display caption (optional) — shown on the public gallery tile / lightbox
  title_he: z.string().max(150).optional(),
  title_en: z.string().max(150).optional(),
  subtitle_he: z.string().max(300).optional(),
  subtitle_en: z.string().max(300).optional(),
  // Dedicated a11y text; when empty the storefront derives <img alt> from the title
  altText_he: z.string().max(300).optional(),
  altText_en: z.string().max(300).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export type CreateGalleryImageInput = z.infer<typeof createGalleryImageSchema>

export const updateGalleryImageSchema = createGalleryImageSchema.partial()
export type UpdateGalleryImageInput = z.infer<typeof updateGalleryImageSchema>

// ── Instagram highlight ───────────────────────────────────────────────────────

export const createInstagramHighlightSchema = z.object({
  url: z.string().url(),
  linkUrl: z.string().url().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export type CreateInstagramHighlightInput = z.infer<typeof createInstagramHighlightSchema>

export const updateInstagramHighlightSchema = createInstagramHighlightSchema.partial()
export type UpdateInstagramHighlightInput = z.infer<typeof updateInstagramHighlightSchema>

// ── FAQ item ──────────────────────────────────────────────────────────────────

export const createFaqItemSchema = z.object({
  question_he: z.string().min(1).max(500),
  question_en: z.string().min(1).max(500),
  answer_he: z.string().min(1).max(3000),
  answer_en: z.string().min(1).max(3000),
  sortOrder: z.number().int().min(0).optional(),
})

export type CreateFaqItemInput = z.infer<typeof createFaqItemSchema>

export const updateFaqItemSchema = createFaqItemSchema.partial()
export type UpdateFaqItemInput = z.infer<typeof updateFaqItemSchema>

// ── Site settings ─────────────────────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  businessName_he: z.string().min(1).max(200).optional(),
  businessName_en: z.string().min(1).max(200).optional(),
  address_he: z.string().min(1).max(500).optional(),
  address_en: z.string().min(1).max(500).optional(),
  phone: z.string().min(1).max(50).optional(),
  whatsappNumber: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  hours_he: z.string().max(300).optional(),
  hours_en: z.string().max(300).optional(),
  instagramUrl: z.string().max(300).optional(),
  facebookUrl: z.string().max(300).optional(),
  shippingCostNational: z.number().min(0).optional(),
  freeShippingAbove: z.number().min(0).optional(),
  studioAddress: z.string().max(500).optional(),
  deliveryRatePerKm: z.number().min(0).optional(),
  minDeliveryFee: z.number().min(0).optional(),
  maxDeliveryFee: z.number().min(0).optional(),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>

// ── Reviews ───────────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  productId: z.string().min(1),
  customerName: z.string().min(2).max(100),
  rating: z.number().int().min(1).max(5),
  comment_he: z.string().max(2000).optional(),
  comment_en: z.string().max(2000).optional(),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>

export const updateReviewSchema = z.object({
  isApproved: z.boolean().optional(),
  comment_he: z.string().max(2000).nullable().optional(),
  comment_en: z.string().max(2000).nullable().optional(),
})

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>

// ── Price offer request ───────────────────────────────────────────────────────

export const createPriceOfferSchema = z.object({
  productId: z.string().min(1),
  customerName: z.string().min(2).max(200),
  phone: z
    .string()
    .min(7)
    .max(20)
    .regex(/^[0-9+\-() ]+$/, 'Invalid phone number'),
  email: z.string().email().optional(),
  message: z.string().max(2000).optional(),
  variantId: z.string().optional(),
  isCustom: z.boolean().optional(),
  customWidth: z.number().positive().max(10000).optional(),
  customHeight: z.number().positive().max(10000).optional(),
  customDepth: z.number().positive().max(10000).optional(),
  colorId: z.string().optional(),
  quantity: z.number().int().min(1).max(99).optional(),
  language: z.enum(['he', 'en']).optional(),
})

export type CreatePriceOfferInput = z.infer<typeof createPriceOfferSchema>

export const updatePriceOfferSchema = z.object({
  status: z.enum(['NEW', 'HANDLED']),
})

export type UpdatePriceOfferInput = z.infer<typeof updatePriceOfferSchema>

// ── Site content value ────────────────────────────────────────────────────────

export const siteContentValueSchema = z.object({
  value: z.unknown().refine((v) => v !== null && typeof v === 'object', {
    message: 'Value must be a JSON object or array',
  }),
})

export type SiteContentValueInput = z.infer<typeof siteContentValueSchema>

// ── Email settings test ───────────────────────────────────────────────────────

export const testEmailSchema = z.object({
  to: z.string().email(),
})
