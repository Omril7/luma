import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { withApi, parseBody } from '@/server/http'
import { getSiteSettings } from '@/server/services/adminSettingsService'
import {
  calculateDeliveryFee,
  DeliveryEstimateError,
} from '@/server/services/deliveryDistanceService'

const estimateSchema = z.object({
  address: z.string().min(3).max(300),
})

export const POST = withApi(async (req: NextRequest) => {
  const body = await parseBody(req, estimateSchema)
  if (body instanceof NextResponse) return body

  const settings = await getSiteSettings()

  try {
    const { distanceKm, fee } = await calculateDeliveryFee(body.address, settings)
    return NextResponse.json({
      distanceKm,
      fee,
      ratePerKm: settings.delivery.deliveryRatePerKm,
      minFee: settings.delivery.minDeliveryFee,
      maxFee: settings.delivery.maxDeliveryFee,
    })
  } catch (err) {
    if (err instanceof DeliveryEstimateError) {
      if (err.code === 'ADDRESS_NOT_FOUND') {
        return NextResponse.json({ error: 'ADDRESS_NOT_FOUND' }, { status: 422 })
      }
      if (err.code === 'NOT_CONFIGURED') {
        return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 503 })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
