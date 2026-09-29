import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { withApi, errorResponse, zodErrorResponse } from '@/server/http'
import { autocompletePlaces } from '@/server/services/deliveryDistanceService'

const querySchema = z.object({
  kind: z.enum(['city', 'street']),
  text: z.string().trim().min(3).max(200),
  // Chosen city — narrows street results to it
  city: z.string().trim().min(1).max(100).optional(),
  cityLng: z.coerce.number().min(-180).max(180).optional(),
  cityLat: z.coerce.number().min(-90).max(90).optional(),
})

export const GET = withApi(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams
  const parsed = querySchema.safeParse({
    kind: params.get('kind'),
    text: params.get('text'),
    city: params.get('city') ?? undefined,
    cityLng: params.get('cityLng') ?? undefined,
    cityLat: params.get('cityLat') ?? undefined,
  })
  if (!parsed.success) return zodErrorResponse(parsed.error)
  const { kind, text, city, cityLng, cityLat } = parsed.data

  try {
    const suggestions = await autocompletePlaces(
      kind,
      text,
      city && cityLng != null && cityLat != null
        ? { label: city, coords: [cityLng, cityLat] }
        : undefined,
      req.signal
    )
    return NextResponse.json(suggestions)
  } catch (err) {
    if (req.signal.aborted) return new NextResponse(null, { status: 499 })
    console.error('[delivery/autocomplete]', err)
    return errorResponse('Address search unavailable', 502)
  }
})
