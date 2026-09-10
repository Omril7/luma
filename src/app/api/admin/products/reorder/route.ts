import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody } from '@/server/http'
import { reorderSchema } from '@/shared/schemas'
import { reorderProducts } from '@/server/services/adminProductService'

// Bulk drag-reorder from /admin/products "סידור תצוגה". Body: { ids: string[] } in the
// desired order; each product's sortOrder is set to its index in one transaction.
export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, reorderSchema)
  if (body instanceof NextResponse) return body

  const result = await reorderProducts(body.ids)
  return NextResponse.json(result)
})
