import 'server-only'
import { prisma } from '@/server/prisma'
import { getEmailProvider } from '@/server/providers/email'
import { getEmailSettings } from '@/server/services/adminEmailSettingsService'
import { getSiteSettings } from '@/server/services/adminSettingsService'
import { calculateProductPrice } from '@/server/services/pricingService'
import type { CreatePriceOfferInput } from '@/shared/schemas'

// ── Create (public) ───────────────────────────────────────────────────────────

export type CreatePriceOfferResult = { id: string } | null

export async function createPriceOfferRequest(
  input: CreatePriceOfferInput
): Promise<CreatePriceOfferResult> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      name_he: true,
      name_en: true,
      slug: true,
      variants: { select: { id: true, name_he: true, name_en: true } },
      colorOptions: { select: { id: true, name_he: true, name_en: true } },
    },
  })
  if (!product) return null

  const isCustom = input.isCustom ?? false
  const quantity = input.quantity ?? 1
  const language = input.language ?? 'he'

  // Snapshot labels so the request stays readable even if options change later.
  const variant = isCustom ? undefined : product.variants.find((v) => v.id === input.variantId)
  const color = product.colorOptions.find((c) => c.id === input.colorId)

  // Best-effort price estimate — a selection outside the pricing bounds is a
  // perfectly valid reason to ask for an offer, so pricing errors are not fatal.
  let quotedPrice: number | undefined
  const priced = await calculateProductPrice(product.id, {
    variantId: isCustom ? undefined : input.variantId,
    custom: isCustom
      ? { width: input.customWidth, height: input.customHeight, depth: input.customDepth }
      : undefined,
    quantity,
  })
  if (priced.result) quotedPrice = priced.result.totalPriceDisplay

  const created = await prisma.priceOfferRequest.create({
    data: {
      productId: product.id,
      customerName: input.customerName,
      phone: input.phone,
      email: input.email,
      message: input.message,
      variantName: variant ? `${variant.name_he} / ${variant.name_en}` : undefined,
      isCustom,
      customWidth: isCustom ? input.customWidth : undefined,
      customHeight: isCustom ? input.customHeight : undefined,
      customDepth: isCustom ? input.customDepth : undefined,
      colorName: color ? `${color.name_he} / ${color.name_en}` : undefined,
      quantity,
      quotedPrice,
      language,
    },
  })

  // Best-effort admin notification — the request is already saved, so an email
  // failure must never fail the submission.
  try {
    await notifyAdmin({
      requestId: created.id,
      productName: product.name_he,
      productSlug: product.slug,
      customerName: input.customerName,
      phone: input.phone,
      email: input.email,
      message: input.message,
      variantName: variant?.name_he,
      isCustom,
      customWidth: input.customWidth,
      customHeight: input.customHeight,
      customDepth: input.customDepth,
      colorName: color?.name_he,
      quantity,
      quotedPrice,
    })
  } catch (err) {
    console.error('[price-offer] admin notification failed:', err)
  }

  return { id: created.id }
}

// ── Admin email notification ──────────────────────────────────────────────────

interface NotifyAdminParams {
  requestId: string
  productName: string
  productSlug: string
  customerName: string
  phone: string
  email?: string
  message?: string
  variantName?: string
  isCustom: boolean
  customWidth?: number
  customHeight?: number
  customDepth?: number
  colorName?: string
  quantity: number
  quotedPrice?: number
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function notifyAdmin(params: NotifyAdminParams): Promise<void> {
  const [settings, site] = await Promise.all([getEmailSettings(), getSiteSettings()])

  // Prefer the business contact email; fall back to reply-to, then from-address.
  const to = site.business.email || settings.replyTo || settings.fromAddress
  if (!to) {
    console.warn('[price-offer] no admin email configured — skipping notification')
    return
  }

  const dims = [params.customWidth, params.customHeight, params.customDepth]
    .filter((d) => d != null)
    .join('×')

  const rows: Array<[string, string]> = [
    ['מוצר', params.productName],
    ['לקוח/ה', params.customerName],
    ['טלפון', params.phone],
    ...(params.email ? ([['אימייל', params.email]] as Array<[string, string]>) : []),
    ...(params.variantName ? ([['גרסה', params.variantName]] as Array<[string, string]>) : []),
    ...(params.isCustom && dims
      ? ([['מידות מבוקשות (ס"מ)', dims]] as Array<[string, string]>)
      : []),
    ...(params.colorName ? ([['צבע', params.colorName]] as Array<[string, string]>) : []),
    ['כמות', String(params.quantity)],
    ...(params.quotedPrice != null
      ? ([['מחיר משוער באתר', `₪${params.quotedPrice.toLocaleString('he-IL')}`]] as Array<
          [string, string]
        >)
      : []),
  ]

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;font-weight:600;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 12px">${escapeHtml(value)}</td></tr>`
    )
    .join('')

  const messageBlock = params.message
    ? `<p style="margin:16px 0 4px;font-weight:600">הודעה מהלקוח/ה:</p><p style="margin:0;white-space:pre-wrap">${escapeHtml(params.message)}</p>`
    : ''

  const html = `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#333;max-width:560px">
      <h2 style="margin:0 0 12px">בקשת הצעת מחיר חדשה</h2>
      <table style="border-collapse:collapse;background:#faf7f2;border-radius:8px">${tableRows}</table>
      ${messageBlock}
      <p style="margin-top:20px;font-size:13px;color:#777">
        ניתן לצפות בכל הבקשות בעמוד "הצעות מחיר" בממשק הניהול.
      </p>
    </div>`

  const provider = await getEmailProvider()
  await provider.send({
    to,
    subject: `בקשת הצעת מחיר — ${params.productName} (${params.customerName})`,
    html,
    from: { address: settings.fromAddress, name: settings.fromName_he },
    ...(params.email ? { replyTo: params.email } : {}),
  })
}
