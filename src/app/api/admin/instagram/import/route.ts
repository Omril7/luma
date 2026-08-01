import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody } from '@/server/http'
import { importInstagramPostSchema } from '@/shared/schemas'
import { importInstagramHighlightFromUrl } from '@/server/services/adminInstagramService'
import {
  InstagramOEmbedError,
  type InstagramOEmbedErrorCode,
} from '@/server/services/instagramOEmbedService'

const STATUS_BY_CODE: Record<InstagramOEmbedErrorCode, number> = {
  INVALID_URL: 422,
  MEDIA_NOT_FOUND: 404,
  ACCESS_TOKEN_REQUIRED: 503,
  UPSTREAM_ERROR: 502,
  FETCH_FAILED: 502,
}

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await parseBody(req, importInstagramPostSchema)
  if (body instanceof NextResponse) return body

  try {
    const highlight = await importInstagramHighlightFromUrl(body.postUrl)
    return NextResponse.json({ highlight }, { status: 201 })
  } catch (err) {
    if (err instanceof InstagramOEmbedError) {
      return NextResponse.json({ error: err.code }, { status: STATUS_BY_CODE[err.code] })
    }
    console.error('[instagram import]', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
})
