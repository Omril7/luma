import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/server/prisma'
import { extractUrlsFromValue, deleteIfOrphaned } from '@/server/services/cloudinaryCleanupService'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SiteContentDTO {
  id: string
  key: string
  value: unknown
  updatedAt: string
}

function toDTO(row: { id: string; key: string; value: unknown; updatedAt: Date }): SiteContentDTO {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    updatedAt: row.updatedAt.toISOString(),
  }
}

// ── List all ──────────────────────────────────────────────────────────────────

export async function getAllSiteContent(): Promise<Record<string, unknown>> {
  const rows = await prisma.siteContent.findMany({ orderBy: { key: 'asc' } })
  const map: Record<string, unknown> = {}
  for (const row of rows) {
    map[row.key] = row.value
  }
  return map
}

// ── Get single ────────────────────────────────────────────────────────────────

export async function getSiteContentByKey(key: string): Promise<SiteContentDTO | null> {
  const row = await prisma.siteContent.findUnique({ where: { key } })
  return row ? toDTO(row) : null
}

// ── Upsert ────────────────────────────────────────────────────────────────────

export async function upsertSiteContent(key: string, value: unknown): Promise<SiteContentDTO> {
  // Collect URLs from the existing value so we can clean up any that are removed
  const oldUrls = new Set<string>()
  const existing = await prisma.siteContent.findUnique({ where: { key } })
  if (existing) {
    extractUrlsFromValue(existing.value, oldUrls)
  }

  const jsonValue = value as Prisma.InputJsonValue
  const row = await prisma.siteContent.upsert({
    where: { key },
    create: { key, value: jsonValue },
    update: { value: jsonValue },
  })

  // Determine which URLs were removed and fire-and-forget orphan cleanup
  const newUrls = new Set<string>()
  extractUrlsFromValue(value, newUrls)

  for (const url of oldUrls) {
    if (!newUrls.has(url)) {
      deleteIfOrphaned(url).catch(console.error)
    }
  }

  return toDTO(row)
}
