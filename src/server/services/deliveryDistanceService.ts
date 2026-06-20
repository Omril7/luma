import 'server-only'
import type { SiteSettingsDTO } from '@/server/services/adminSettingsService'

// ── Errors ────────────────────────────────────────────────────────────────────

export type DeliveryEstimateErrorCode = 'ADDRESS_NOT_FOUND' | 'ROUTING_FAILED' | 'NOT_CONFIGURED'

export class DeliveryEstimateError extends Error {
  code: DeliveryEstimateErrorCode

  constructor(code: DeliveryEstimateErrorCode, message: string) {
    super(message)
    this.name = 'DeliveryEstimateError'
    this.code = code
  }
}

// ── Geocoding ─────────────────────────────────────────────────────────────────

export async function geocodeIsraeliAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY
  if (!apiKey) throw new Error('OPENROUTESERVICE_API_KEY is not configured')

  const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(address)}&boundary.country=ISR&size=1`
  const res = await fetch(url)

  if (!res.ok) return null

  const data = (await res.json()) as {
    features?: Array<{ geometry: { coordinates: [number, number] } }>
  }

  const feature = data.features?.[0]
  if (!feature) return null

  const [lng, lat] = feature.geometry.coordinates
  return { lat, lng }
}

// ── Road distance ─────────────────────────────────────────────────────────────

export async function getRoadDistanceKm(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<number> {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY
  if (!apiKey) throw new Error('OPENROUTESERVICE_API_KEY is not configured')

  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/json', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [origin.lng, origin.lat],
        [dest.lng, dest.lat],
      ],
    }),
  })

  if (!res.ok) {
    throw new DeliveryEstimateError(
      'ROUTING_FAILED',
      `ORS directions request failed: ${res.status}`
    )
  }

  const data = (await res.json()) as { routes?: Array<{ summary: { distance: number } }> }
  const distanceMeters = data.routes?.[0]?.summary?.distance

  if (distanceMeters == null) {
    throw new DeliveryEstimateError('ROUTING_FAILED', 'ORS returned no route')
  }

  return distanceMeters / 1000
}

// ── Fee calculation ───────────────────────────────────────────────────────────

export async function calculateDeliveryFee(
  destinationAddress: string,
  settings: Pick<SiteSettingsDTO, 'delivery'>
): Promise<{ distanceKm: number; fee: number }> {
  const { delivery } = settings

  if (!delivery.studioAddress || delivery.studioLat == null || delivery.studioLng == null) {
    throw new DeliveryEstimateError('NOT_CONFIGURED', 'Studio location is not configured')
  }

  const dest = await geocodeIsraeliAddress(destinationAddress)
  if (!dest) {
    throw new DeliveryEstimateError(
      'ADDRESS_NOT_FOUND',
      `Could not geocode address: ${destinationAddress}`
    )
  }

  const distanceKm = await getRoadDistanceKm(
    { lat: delivery.studioLat, lng: delivery.studioLng },
    dest
  )

  let fee = distanceKm * delivery.deliveryRatePerKm
  fee = Math.max(delivery.minDeliveryFee, fee)
  if (delivery.maxDeliveryFee > 0) {
    fee = Math.min(delivery.maxDeliveryFee, fee)
  }

  return { distanceKm, fee: Math.round(fee) }
}
