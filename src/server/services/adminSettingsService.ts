import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/server/prisma'
import type { UpdateSettingsInput } from '@/shared/schemas'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BusinessSettings {
  businessName_he: string
  businessName_en: string
  address_he: string
  address_en: string
  phone: string
  whatsappNumber: string
  email: string
}

export interface ShippingSettings {
  shippingCostNational: number
  freeShippingAbove?: number
}

export interface SiteSettingsDTO {
  business: BusinessSettings
  shipping: ShippingSettings
}

const SETTINGS_KEY = 'settings'

const DEFAULT_SETTINGS: SiteSettingsDTO = {
  business: {
    businessName_he: 'לומה רהיטים',
    businessName_en: 'Luma Furniture',
    address_he: 'ישראל',
    address_en: 'Israel',
    phone: '',
    whatsappNumber: '',
    email: '',
  },
  shipping: {
    shippingCostNational: 0,
    freeShippingAbove: undefined,
  },
}

// ── Get ───────────────────────────────────────────────────────────────────────

export async function getSiteSettings(): Promise<SiteSettingsDTO> {
  const row = await prisma.siteContent.findUnique({ where: { key: SETTINGS_KEY } })
  if (!row) return DEFAULT_SETTINGS
  const value = row.value as Partial<SiteSettingsDTO>
  return {
    business: { ...DEFAULT_SETTINGS.business, ...(value.business ?? {}) },
    shipping: { ...DEFAULT_SETTINGS.shipping, ...(value.shipping ?? {}) },
  }
}

// ── Upsert ────────────────────────────────────────────────────────────────────

export async function upsertSiteSettings(data: UpdateSettingsInput): Promise<SiteSettingsDTO> {
  const current = await getSiteSettings()

  const updated: SiteSettingsDTO = {
    business: {
      businessName_he: data.businessName_he ?? current.business.businessName_he,
      businessName_en: data.businessName_en ?? current.business.businessName_en,
      address_he: data.address_he ?? current.business.address_he,
      address_en: data.address_en ?? current.business.address_en,
      phone: data.phone ?? current.business.phone,
      whatsappNumber: data.whatsappNumber ?? current.business.whatsappNumber,
      email: data.email ?? current.business.email,
    },
    shipping: {
      shippingCostNational: data.shippingCostNational ?? current.shipping.shippingCostNational,
      freeShippingAbove: data.freeShippingAbove ?? current.shipping.freeShippingAbove,
    },
  }

  const value = updated as unknown as Prisma.InputJsonValue
  await prisma.siteContent.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value },
    update: { value },
  })

  return updated
}
