import 'server-only'
import { prisma } from '@/server/prisma'
import { deleteIfOrphaned } from '@/server/services/cloudinaryCleanupService'

export interface GalleryImageDTO {
  id: string
  url: string
  /** Display caption shown on the public gallery tile / lightbox (optional). */
  title_he: string
  title_en: string
  subtitle_he: string
  subtitle_en: string
  /** Dedicated a11y text; storefront falls back to the title when empty. */
  altText_he: string
  altText_en: string
  sortOrder: number
  isActive: boolean
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listGalleryImages({
  activeOnly = false,
}: { activeOnly?: boolean } = {}): Promise<GalleryImageDTO[]> {
  return prisma.galleryImage.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { sortOrder: 'asc' },
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateGalleryImageInput {
  url: string
  title_he?: string
  title_en?: string
  subtitle_he?: string
  subtitle_en?: string
  altText_he?: string
  altText_en?: string
  sortOrder?: number
}

export async function createGalleryImage(data: CreateGalleryImageInput): Promise<GalleryImageDTO> {
  let sortOrder = data.sortOrder
  if (sortOrder === undefined) {
    const { _max } = await prisma.galleryImage.aggregate({ _max: { sortOrder: true } })
    sortOrder = (_max.sortOrder ?? -1) + 1
  }

  return prisma.galleryImage.create({
    data: {
      url: data.url,
      title_he: data.title_he ?? '',
      title_en: data.title_en ?? '',
      subtitle_he: data.subtitle_he ?? '',
      subtitle_en: data.subtitle_en ?? '',
      altText_he: data.altText_he ?? '',
      altText_en: data.altText_en ?? '',
      sortOrder,
    },
  })
}

// ── Update ────────────────────────────────────────────────────────────────────

export interface UpdateGalleryImageInput {
  url?: string
  title_he?: string
  title_en?: string
  subtitle_he?: string
  subtitle_en?: string
  altText_he?: string
  altText_en?: string
  sortOrder?: number
}

export async function updateGalleryImage(
  id: string,
  data: UpdateGalleryImageInput
): Promise<GalleryImageDTO | null> {
  const existing = await prisma.galleryImage.findUnique({ where: { id } })
  if (!existing) return null

  const updated = await prisma.galleryImage.update({ where: { id }, data })

  // If the URL changed, fire-and-forget orphan cleanup on the old URL
  if (data.url !== undefined && data.url !== existing.url) {
    deleteIfOrphaned(existing.url).catch(console.error)
  }

  return updated
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteGalleryImage(id: string): Promise<boolean> {
  const deleted = await prisma.galleryImage.delete({ where: { id } }).catch(() => null)
  if (!deleted) return false

  // Fire-and-forget orphan cleanup for the removed gallery item's URL
  deleteIfOrphaned(deleted.url).catch(console.error)

  return true
}
