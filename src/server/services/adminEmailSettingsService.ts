import 'server-only'
import { prisma } from '@/server/prisma'
import type { UpdateEmailSettingsInput } from '@/shared/schemas'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmailSettingsDTO {
  id: string
  fromAddress: string
  fromName_he: string
  fromName_en: string
  replyTo?: string
  updatedAt: string
}

function toDTO(row: {
  id: string
  fromAddress: string
  fromName_he: string
  fromName_en: string
  replyTo: string | null
  updatedAt: Date
}): EmailSettingsDTO {
  return {
    id: row.id,
    fromAddress: row.fromAddress,
    fromName_he: row.fromName_he,
    fromName_en: row.fromName_en,
    replyTo: row.replyTo ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  }
}

const DEFAULT_SETTINGS = {
  fromAddress: 'noreply@luma-furniture.co.il',
  fromName_he: 'לומה רהיטים',
  fromName_en: 'Luma Furniture',
  replyTo: null,
}

// ── Get (create default if none) ──────────────────────────────────────────────

export async function getEmailSettings(): Promise<EmailSettingsDTO> {
  const row = await prisma.emailSettings.findFirst()
  if (row) return toDTO(row)

  // Create default row
  const created = await prisma.emailSettings.create({ data: DEFAULT_SETTINGS })
  return toDTO(created)
}

// ── Upsert ────────────────────────────────────────────────────────────────────

export async function upsertEmailSettings(
  data: UpdateEmailSettingsInput
): Promise<EmailSettingsDTO> {
  const existing = await prisma.emailSettings.findFirst()

  if (existing) {
    const updated = await prisma.emailSettings.update({
      where: { id: existing.id },
      data: {
        fromAddress: data.fromAddress,
        fromName_he: data.fromName_he,
        fromName_en: data.fromName_en,
        replyTo: data.replyTo ?? null,
      },
    })
    return toDTO(updated)
  }

  const created = await prisma.emailSettings.create({
    data: {
      fromAddress: data.fromAddress,
      fromName_he: data.fromName_he,
      fromName_en: data.fromName_en,
      replyTo: data.replyTo ?? null,
    },
  })
  return toDTO(created)
}
