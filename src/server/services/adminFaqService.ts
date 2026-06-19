import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/server/prisma'

// ── Note ──────────────────────────────────────────────────────────────────────
// No dedicated FaqItem model in the Prisma schema.
// FAQ is stored as a SiteContent blob under key "faq".
// Shape: array of { id, question_he, question_en, answer_he, answer_en, sortOrder }

export interface FaqItemDTO {
  id: string
  question_he: string
  question_en: string
  answer_he: string
  answer_en: string
  sortOrder: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadItems(): Promise<FaqItemDTO[]> {
  const row = await prisma.siteContent.findUnique({ where: { key: 'faq' } })
  if (!row || !Array.isArray(row.value)) return []
  return row.value as unknown as FaqItemDTO[]
}

async function saveItems(items: FaqItemDTO[]): Promise<void> {
  const value = items as unknown as Prisma.InputJsonValue
  await prisma.siteContent.upsert({
    where: { key: 'faq' },
    create: { key: 'faq', value },
    update: { value },
  })
}

function generateId(): string {
  return `faq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listFaqItems(): Promise<FaqItemDTO[]> {
  const items = await loadItems()
  return items.sort((a, b) => a.sortOrder - b.sortOrder)
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateFaqItemInput {
  question_he: string
  question_en: string
  answer_he: string
  answer_en: string
  sortOrder?: number
}

export async function createFaqItem(data: CreateFaqItemInput): Promise<FaqItemDTO> {
  const items = await loadItems()
  const maxSort = items.reduce((m, i) => Math.max(m, i.sortOrder), -1)
  const newItem: FaqItemDTO = {
    id: generateId(),
    question_he: data.question_he,
    question_en: data.question_en,
    answer_he: data.answer_he,
    answer_en: data.answer_en,
    sortOrder: data.sortOrder ?? maxSort + 1,
  }
  items.push(newItem)
  await saveItems(items)
  return newItem
}

// ── Update ────────────────────────────────────────────────────────────────────

export interface UpdateFaqItemInput {
  question_he?: string
  question_en?: string
  answer_he?: string
  answer_en?: string
  sortOrder?: number
}

export async function updateFaqItem(
  id: string,
  data: UpdateFaqItemInput
): Promise<FaqItemDTO | null> {
  const items = await loadItems()
  const idx = items.findIndex((i) => i.id === id)
  if (idx === -1) return null

  items[idx] = { ...items[idx], ...data }
  await saveItems(items)
  return items[idx]
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteFaqItem(id: string): Promise<boolean> {
  const items = await loadItems()
  const filtered = items.filter((i) => i.id !== id)
  if (filtered.length === items.length) return false
  await saveItems(filtered)
  return true
}
