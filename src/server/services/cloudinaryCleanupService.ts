import 'server-only'
import { prisma } from '@/server/prisma'
import { getStorageProvider } from '@/server/providers/storage'

// ── Public ID extraction ───────────────────────────────────────────────────────

/**
 * Extract the Cloudinary public ID from a full secure URL.
 * URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{ext}
 * Returns null if the URL is not a Cloudinary URL or cannot be parsed.
 */
export function extractPublicId(url: string): string | null {
  if (!url.includes('res.cloudinary.com')) return null

  const uploadMarker = '/upload/'
  const uploadIdx = url.indexOf(uploadMarker)
  if (uploadIdx === -1) return null

  // Everything after /upload/
  let after = url.slice(uploadIdx + uploadMarker.length)

  // Remove optional version prefix: v1234567890/
  after = after.replace(/^v\d+\//, '')

  // Remove file extension (strip from the last dot)
  const lastDot = after.lastIndexOf('.')
  if (lastDot !== -1) {
    after = after.slice(0, lastDot)
  }

  return after || null
}

// ── URL collection ─────────────────────────────────────────────────────────────

/**
 * Recursively walk any JSON value and collect every string that looks like a URL.
 */
export function extractUrlsFromValue(val: unknown, out: Set<string>): void {
  if (typeof val === 'string') {
    if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/')) {
      out.add(val)
    }
    return
  }
  if (Array.isArray(val)) {
    for (const item of val) extractUrlsFromValue(item, out)
    return
  }
  if (val !== null && typeof val === 'object') {
    for (const v of Object.values(val as Record<string, unknown>)) {
      extractUrlsFromValue(v, out)
    }
  }
}

/**
 * Collect every image URL currently stored anywhere in the database:
 *   - ProductImage.url
 *   - ColorOption.imageUrl (where not null)
 *   - All SiteContent.value JSON blobs (recursively)
 */
async function getAllDbImageUrls(): Promise<Set<string>> {
  const urls = new Set<string>()

  const [productImages, colorOptions, siteContents] = await Promise.all([
    prisma.productImage.findMany({ select: { url: true } }),
    prisma.colorOption.findMany({ select: { imageUrl: true } }),
    prisma.siteContent.findMany({ select: { value: true } }),
  ])

  for (const img of productImages) {
    urls.add(img.url)
  }

  for (const color of colorOptions) {
    if (color.imageUrl) urls.add(color.imageUrl)
  }

  for (const content of siteContents) {
    extractUrlsFromValue(content.value, urls)
  }

  return urls
}

// ── Orphan deletion ───────────────────────────────────────────────────────────

/**
 * Delete the given URL from storage if it is no longer referenced anywhere in the DB.
 *
 * - Skips empty/null values and non-Cloudinary URLs.
 * - Skips if the URL is still referenced in the DB (the orphan check).
 * - Logs success/failure; never throws so cleanup never fails a save operation.
 */
export async function deleteIfOrphaned(url: string | null | undefined): Promise<void> {
  try {
    if (!url) return
    if (!url.includes('res.cloudinary.com')) return

    const stillReferenced = await getAllDbImageUrls()
    if (stillReferenced.has(url)) return

    const publicId = extractPublicId(url)
    if (!publicId) {
      console.warn('[cloudinaryCleanup] Could not extract public ID from URL:', url)
      return
    }

    const storage = await getStorageProvider()
    await storage.delete(publicId)
    console.log('[cloudinaryCleanup] Deleted orphaned asset:', publicId)
  } catch (err) {
    console.error('[cloudinaryCleanup] Failed to delete orphaned asset:', url, err)
  }
}
