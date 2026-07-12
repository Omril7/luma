import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/server/prisma'
import { deleteIfOrphaned } from '@/server/services/cloudinaryCleanupService'

// ── Note ──────────────────────────────────────────────────────────────────────
// The Prisma schema has no dedicated InstagramHighlight model.
// Highlights are stored as a SiteContent blob under key "instagram.highlights".
// Shape: array of { id, url, linkUrl, sortOrder, isActive }

export interface InstagramHighlightDTO {
  id: string
  url: string
  linkUrl?: string
  sortOrder: number
  isActive: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadItems(): Promise<InstagramHighlightDTO[]> {
  const row = await prisma.siteContent.findUnique({ where: { key: 'instagram.highlights' } })
  if (!row || !Array.isArray(row.value)) return []
  return row.value as unknown as InstagramHighlightDTO[]
}

async function saveItems(items: InstagramHighlightDTO[]): Promise<void> {
  const value = items as unknown as Prisma.InputJsonValue
  await prisma.siteContent.upsert({
    where: { key: 'instagram.highlights' },
    create: { key: 'instagram.highlights', value },
    update: { value },
  })
}

function generateId(): string {
  return `ig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listInstagramHighlights(): Promise<InstagramHighlightDTO[]> {
  const items = await loadItems()
  return items.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function listActiveInstagramHighlights(): Promise<InstagramHighlightDTO[]> {
  const items = await listInstagramHighlights()
  return items.filter((i) => i.isActive)
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateInstagramHighlightInput {
  url: string
  linkUrl?: string
  sortOrder?: number
  isActive?: boolean
}

export async function createInstagramHighlight(
  data: CreateInstagramHighlightInput
): Promise<InstagramHighlightDTO> {
  const items = await loadItems()
  const maxSort = items.reduce((m, i) => Math.max(m, i.sortOrder), -1)
  const newItem: InstagramHighlightDTO = {
    id: generateId(),
    url: data.url,
    linkUrl: data.linkUrl,
    sortOrder: data.sortOrder ?? maxSort + 1,
    isActive: data.isActive ?? true,
  }
  items.push(newItem)
  await saveItems(items)
  return newItem
}

// ── Update ────────────────────────────────────────────────────────────────────

export interface UpdateInstagramHighlightInput {
  url?: string
  linkUrl?: string
  sortOrder?: number
  isActive?: boolean
}

export async function updateInstagramHighlight(
  id: string,
  data: UpdateInstagramHighlightInput
): Promise<InstagramHighlightDTO | null> {
  const items = await loadItems()
  const idx = items.findIndex((i) => i.id === id)
  if (idx === -1) return null

  const oldUrl = items[idx].url
  items[idx] = { ...items[idx], ...data }
  await saveItems(items)

  // If the URL changed, fire-and-forget orphan cleanup on the old URL
  if (data.url !== undefined && data.url !== oldUrl) {
    deleteIfOrphaned(oldUrl).catch(console.error)
  }

  return items[idx]
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteInstagramHighlight(id: string): Promise<boolean> {
  const items = await loadItems()
  const deleted = items.find((i) => i.id === id)
  if (!deleted) return false
  const filtered = items.filter((i) => i.id !== id)
  await saveItems(filtered)

  // Fire-and-forget orphan cleanup for the removed highlight's URL
  deleteIfOrphaned(deleted.url).catch(console.error)

  return true
}
