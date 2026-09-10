import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody } from '@/server/http'
import { reorderSchema } from '@/shared/schemas'
import { reorderFeaturedHomeReviews } from '@/server/services/reviewService'

// Bulk drag-reorder from /admin/reviews "סדר בעמוד הבית". Body: { ids: string[] } in the
// desired order; each review's sortOrder is set to its index in one transaction. Drives
// getFeaturedHomeReviews (the homepage TestimonialsSection).
export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, reorderSchema)
  if (body instanceof NextResponse) return body

  const result = await reorderFeaturedHomeReviews(body.ids)
  return NextResponse.json(result)
})
