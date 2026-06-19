import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/server/prisma'

// ── Note ──────────────────────────────────────────────────────────────────────
// The Prisma schema has no dedicated GalleryImage model.
// Gallery is stored as a SiteContent blob under key "gallery".
// Shape: array of { id, url, altText_he, altText_en, sortOrder }

export interface GalleryImageDTO {
  id: string
  url: string
  altText_he: string
  altText_en: string
  sortOrder: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadItems(): Promise<GalleryImageDTO[]> {
  const row = await prisma.siteContent.findUnique({ where: { key: 'gallery' } })
  if (!row || !Array.isArray(row.value)) return []
  return row.value as unknown as GalleryImageDTO[]
}

async function saveItems(items: GalleryImageDTO[]): Promise<void> {
  const value = items as unknown as Prisma.InputJsonValue
  await prisma.siteContent.upsert({
    where: { key: 'gallery' },
    create: { key: 'gallery', value },
    update: { value },
  })
}

function generateId(): string {
  return `gi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listGalleryImages(): Promise<GalleryImageDTO[]> {
  const items = await loadItems()
  return items.sort((a, b) => a.sortOrder - b.sortOrder)
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateGalleryImageInput {
  url: string
  altText_he: string
  altText_en: string
  sortOrder?: number
}

export async function createGalleryImage(data: CreateGalleryImageInput): Promise<GalleryImageDTO> {
  const items = await loadItems()
  const maxSort = items.reduce((m, i) => Math.max(m, i.sortOrder), -1)
  const newItem: GalleryImageDTO = {
    id: generateId(),
    url: data.url,
    altText_he: data.altText_he,
    altText_en: data.altText_en,
    sortOrder: data.sortOrder ?? maxSort + 1,
  }
  items.push(newItem)
  await saveItems(items)
  return newItem
}

// ── Update ────────────────────────────────────────────────────────────────────

export interface UpdateGalleryImageInput {
  url?: string
  altText_he?: string
  altText_en?: string
  sortOrder?: number
}

export async function updateGalleryImage(
  id: string,
  data: UpdateGalleryImageInput
): Promise<GalleryImageDTO | null> {
  const items = await loadItems()
  const idx = items.findIndex((i) => i.id === id)
  if (idx === -1) return null

  items[idx] = { ...items[idx], ...data }
  await saveItems(items)
  return items[idx]
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteGalleryImage(id: string): Promise<boolean> {
  const items = await loadItems()
  const filtered = items.filter((i) => i.id !== id)
  if (filtered.length === items.length) return false
  await saveItems(filtered)
  return true
}
