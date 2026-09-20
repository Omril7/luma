import 'server-only'
import { prisma } from '@/server/prisma'
import { getStorageProvider } from '@/server/providers/storage'

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
 *   - Review.imageUrl (where not null)
 *   - GalleryImage.url
 *   - All SiteContent.value JSON blobs (recursively)
 */
async function getAllDbImageUrls(): Promise<Set<string>> {
  const urls = new Set<string>()

  const [productImages, colorOptions, reviewImages, galleryImages, siteContents] =
    await Promise.all([
      prisma.productImage.findMany({ select: { url: true } }),
      prisma.colorOption.findMany({ select: { imageUrl: true } }),
      prisma.review.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
      prisma.galleryImage.findMany({ select: { url: true } }),
      prisma.siteContent.findMany({ select: { value: true } }),
    ])

  for (const img of productImages) {
    urls.add(img.url)
  }

  for (const color of colorOptions) {
    if (color.imageUrl) urls.add(color.imageUrl)
  }

  for (const review of reviewImages) {
    if (review.imageUrl) urls.add(review.imageUrl)
  }

  for (const img of galleryImages) {
    urls.add(img.url)
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

    const storage = await getStorageProvider()
    const key = storage.keyFromUrl(url)
    if (!key) return

    const stillReferenced = await getAllDbImageUrls()
    if (stillReferenced.has(url)) return

    await storage.deleteAsset(key)
    console.log('[cloudinaryCleanup] Deleted orphaned asset:', key)
  } catch (err) {
    console.error('[cloudinaryCleanup] Failed to delete orphaned asset:', url, err)
  }
}
