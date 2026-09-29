import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { withApi, errorResponse, zodErrorResponse } from '@/server/http'
import { reverseGeocodeIsrael } from '@/server/services/deliveryDistanceService'

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
})

export const GET = withApi(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams
  const parsed = querySchema.safeParse({ lat: params.get('lat'), lng: params.get('lng') })
  if (!parsed.success) return zodErrorResponse(parsed.error)

  try {
    const result = await reverseGeocodeIsrael(parsed.data, req.signal)
    if (!result) return NextResponse.json({ error: 'ADDRESS_NOT_FOUND' }, { status: 404 })
    return NextResponse.json(result)
  } catch (err) {
    if (req.signal.aborted) return new NextResponse(null, { status: 499 })
    console.error('[delivery/reverse]', err)
    return errorResponse('Address lookup unavailable', 502)
  }
})
