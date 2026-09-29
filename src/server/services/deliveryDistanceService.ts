import 'server-only'
import type { SiteSettingsDTO } from '@/server/services/adminSettingsService'

// ── Config ────────────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number
  lng: number
}

/**
 * How the distance for the delivery fee is obtained.
 *  - 'straight-line': haversine × roadFactor, no API call (default)
 *  - 'routing': one ORS directions call (cached; falls back to straight-line on failure)
 */
export const DELIVERY_DISTANCE_CONFIG: { mode: 'straight-line' | 'routing'; roadFactor: number } = {
  mode: 'straight-line',
  roadFactor: 1.3,
}

const ORS_BASE = 'https://api.openrouteservice.org'

// ORS_API_KEY is canonical; the old name is kept as a fallback.
function getOrsKey(): string {
  const key = process.env.ORS_API_KEY ?? process.env.OPENROUTESERVICE_API_KEY
  if (!key) throw new Error('ORS_API_KEY is not configured')
  return key
}

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

export async function geocodeIsraeliAddress(address: string): Promise<Coordinates | null> {
  const apiKey = getOrsKey()

  const url = `${ORS_BASE}/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(address)}&boundary.country=ISR&size=1`
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

// ── Address autocomplete / reverse geocoding (proxied for the checkout picker) ─
// Photon (photon.komoot.io, OSM data, no key) — much better Hebrew matching than ORS geocoding.
// ORS is still used for routing and for geocoding the studio address.

const PHOTON_BASE = 'https://photon.komoot.io'
const PHOTON_HEADERS = { 'User-Agent': 'luma-shop-checkout' }
// Israel bounding box: minLon,minLat,maxLon,maxLat
const ISRAEL_BBOX = '34.2,29.4,35.9,33.4'
// Streets are only accepted this close to the chosen city's centre
const STREET_MAX_KM_FROM_CITY = 30

export type PlaceKind = 'city' | 'street'

export interface PlaceSuggestion {
  label: string
  coords: [number, number] // [lng, lat]
}

export interface ReverseResult {
  city: string
  street: string | null
  coords: [number, number] // the customer's own point
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    type?: string
    city?: string
    locality?: string
    district?: string
    countrycode?: string
  }
}

interface PhotonResponse {
  features?: PhotonFeature[]
}

function dedupePlaces(features: PhotonFeature[]): PlaceSuggestion[] {
  const seen = new Set<string>()
  const out: PlaceSuggestion[] = []
  for (const f of features) {
    const { name, countrycode } = f.properties
    if (!name || !f.geometry?.coordinates || (countrycode && countrycode !== 'IL')) continue
    if (seen.has(name)) continue
    seen.add(name)
    out.push({ label: name, coords: [f.geometry.coordinates[0], f.geometry.coordinates[1]] })
  }
  return out
}

export async function autocompletePlaces(
  kind: PlaceKind,
  text: string,
  city?: { label: string; coords: [number, number] },
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ limit: '10', bbox: ISRAEL_BBOX })
  if (kind === 'city') {
    params.set('q', text)
    params.append('layer', 'city')
    params.append('layer', 'locality')
  } else {
    params.set('q', city ? `${text} ${city.label}` : text)
    params.append('layer', 'street')
    if (city) {
      // Bias results towards the chosen city
      params.set('lon', String(city.coords[0]))
      params.set('lat', String(city.coords[1]))
    }
  }
  const res = await fetch(`${PHOTON_BASE}/api/?${params}`, { signal, headers: PHOTON_HEADERS })
  if (!res.ok) throw new Error(`Photon search failed: ${res.status}`)
  const data = (await res.json()) as PhotonResponse

  let features = data.features ?? []
  if (kind === 'street' && city) {
    const origin = { lng: city.coords[0], lat: city.coords[1] }
    features = features.filter(
      (f) =>
        haversineKm(origin, { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }) <=
        STREET_MAX_KM_FROM_CITY
    )
  }
  return dedupePlaces(features).slice(0, 5)
}

export async function reverseGeocodeIsrael(
  point: Coordinates,
  signal?: AbortSignal
): Promise<ReverseResult | null> {
  const params = new URLSearchParams({ lat: String(point.lat), lon: String(point.lng) })
  params.append('layer', 'house')
  params.append('layer', 'street')
  const res = await fetch(`${PHOTON_BASE}/reverse?${params}`, { signal, headers: PHOTON_HEADERS })
  if (!res.ok) throw new Error(`Photon reverse failed: ${res.status}`)
  const p = ((await res.json()) as PhotonResponse).features?.[0]?.properties
  if (!p || (p.countrycode && p.countrycode !== 'IL')) return null
  const city = p.city ?? p.locality ?? p.district
  if (!city) return null
  const street = p.type === 'street' ? (p.name ?? null) : (p.street ?? null)
  return { city, street, coords: [point.lng, point.lat] }
}

// ── Distance ──────────────────────────────────────────────────────────────────

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function getStraightLineDistanceKm(origin: Coordinates, dest: Coordinates): number {
  return haversineKm(origin, dest) * DELIVERY_DISTANCE_CONFIG.roadFactor
}

export async function getRoadDistanceKm(origin: Coordinates, dest: Coordinates): Promise<number> {
  const apiKey = getOrsKey()

  const res = await fetch(`${ORS_BASE}/v2/directions/driving-car/json`, {
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

// In-memory cache (per server instance). Coordinates rounded to 4 decimals (~11 m).
const routeCache = new Map<string, number>()
const ROUTE_CACHE_MAX = 500

function routeCacheKey(origin: Coordinates, dest: Coordinates): string {
  const r = (n: number) => n.toFixed(4)
  return `${r(origin.lat)},${r(origin.lng)}>${r(dest.lat)},${r(dest.lng)}`
}

export async function getDistanceKm(origin: Coordinates, dest: Coordinates): Promise<number> {
  if (DELIVERY_DISTANCE_CONFIG.mode === 'straight-line') {
    return getStraightLineDistanceKm(origin, dest)
  }

  const key = routeCacheKey(origin, dest)
  const cached = routeCache.get(key)
  if (cached != null) return cached

  try {
    const km = await getRoadDistanceKm(origin, dest)
    if (routeCache.size >= ROUTE_CACHE_MAX) {
      routeCache.delete(routeCache.keys().next().value as string)
    }
    routeCache.set(key, km)
    return km
  } catch (err) {
    // ORS down, key missing or quota exceeded (429) — degrade to straight-line
    console.warn('[delivery] routing failed, using straight-line distance:', err)
    return getStraightLineDistanceKm(origin, dest)
  }
}

// ── Fee calculation ───────────────────────────────────────────────────────────

/** `destination` is coordinates (preferred — no geocoding) or a free-text address (legacy). */
export async function calculateDeliveryFee(
  destination: Coordinates | string,
  settings: Pick<SiteSettingsDTO, 'delivery'>
): Promise<{ distanceKm: number; fee: number }> {
  const { delivery } = settings

  if (!delivery.studioAddress || delivery.studioLat == null || delivery.studioLng == null) {
    throw new DeliveryEstimateError('NOT_CONFIGURED', 'Studio location is not configured')
  }

  let dest: Coordinates
  if (typeof destination === 'string') {
    const geocoded = await geocodeIsraeliAddress(destination)
    if (!geocoded) {
      throw new DeliveryEstimateError(
        'ADDRESS_NOT_FOUND',
        `Could not geocode address: ${destination}`
      )
    }
    dest = geocoded
  } else {
    dest = destination
  }

  const distanceKm = await getDistanceKm({ lat: delivery.studioLat, lng: delivery.studioLng }, dest)

  let fee = distanceKm * delivery.deliveryRatePerKm
  fee = Math.max(delivery.minDeliveryFee, fee)
  if (delivery.maxDeliveryFee > 0) {
    fee = Math.min(delivery.maxDeliveryFee, fee)
  }

  // Customer-facing price is rounded up to the next 10 (207 → 210, 53 → 60)
  return { distanceKm, fee: Math.ceil(fee / 10) * 10 }
}
