import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse } from '@/server/http'
import { createProductSchema, createVariantSchema, customPricingRuleSchema } from '@/shared/schemas'
import { z } from 'zod'
import {
  listAdminProducts,
  createAdminProduct,
  type FullCreateProductInput,
} from '@/server/services/adminProductService'

const fullCreateSchema = createProductSchema.extend({
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

export const GET = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '25', 10)
  const category = searchParams.get('category') ?? undefined
  const search = searchParams.get('search') ?? undefined
  const isActiveParam = searchParams.get('isActive')
  const isActive = isActiveParam === null ? undefined : isActiveParam === 'true'

  const result = await listAdminProducts({ page, limit, category, search, isActive })
  return NextResponse.json(result)
})

export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, fullCreateSchema)
  if (body instanceof NextResponse) return body

  try {
    const product = await createAdminProduct(body as FullCreateProductInput)
    return NextResponse.json({ product }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return errorResponse('A product with this slug already exists', 409)
    }
    throw err
  }
})
