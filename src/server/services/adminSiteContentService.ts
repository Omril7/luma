import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/server/prisma'

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
  const jsonValue = value as Prisma.InputJsonValue
  const row = await prisma.siteContent.upsert({
    where: { key },
    create: { key, value: jsonValue },
    update: { value: jsonValue },
  })
  return toDTO(row)
}
