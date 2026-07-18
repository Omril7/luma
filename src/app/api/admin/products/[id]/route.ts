import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse, type AdminPayload } from '@/server/http'
import { createProductSchema, createVariantSchema, customPricingRuleSchema } from '@/shared/schemas'
import { z } from 'zod'
import {
  getAdminProductById,
  updateAdminProduct,
  deleteAdminProduct,
} from '@/server/services/adminProductService'

const fullUpdateSchema = createProductSchema
  .extend({
    variants: z.array(createVariantSchema).min(1),
    customPricingRule: customPricingRuleSchema.optional(),
    images: z
      .array(
        z.object({
          url: z.string().url(),
          altText_he: z.string(),
          altText_en: z.string(),
          sortOrder: z.number().int().default(0),
          isPrimary: z.boolean().default(false),
        })
      )
      .optional(),
    colorIds: z.array(z.string()).optional(),
  })
  .partial()

type Ctx = { params: Promise<{ id: string }> }

export const GET = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params
  const product = await getAdminProductById(id)
  if (!product) return errorResponse('Product not found', 404)
  return NextResponse.json({ product })
})

export const PUT = withAdmin<Ctx>(async (req, _admin: AdminPayload, { params }) => {
  const { id } = await params
  const existing = await getAdminProductById(id)
  if (!existing) return errorResponse('Product not found', 404)

  const body = await parseBody(req, fullUpdateSchema)
  if (body instanceof NextResponse) return body

  const product = await updateAdminProduct(id, body)
  return NextResponse.json({ product })
})

export const DELETE = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params
  const existing = await getAdminProductById(id)
  if (!existing) return errorResponse('Product not found', 404)

  const result = await deleteAdminProduct(id)
  if (!result.deleted) {
    return errorResponse('Product has existing orders and cannot be deleted', 409)
  }
  return NextResponse.json({ success: true })
})
