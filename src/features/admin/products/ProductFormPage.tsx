'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import NextImage from 'next/image'
import {
  ArrowRight,
  Save,
  Plus,
  Trash2,
  ImageIcon,
  GripVertical,
  Upload,
  Star,
  StarOff,
  Check,
  X as XIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import type { ProductDTO, ColorOptionDTO } from '@/shared/types'

// ── Types ─────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  TABLE: 'שולחן',
  SHELF: 'מדף',
  CONSOLE: 'קונסולה',
  SHOE_RACK: 'מדף נעליים',
  NIGHTSTAND: 'שידת לילה',
  ARMCHAIR: 'כורסא',
  TV_STAND: 'מזנון TV',
  BENCH: 'ספסל',
  OTHER: 'אחר',
}
const CATEGORIES = Object.keys(CATEGORY_LABELS)

type Tab = 'basic' | 'variants' | 'pricing' | 'colors' | 'images'

interface VariantRow {
  _key: string
  name_he: string
  name_en: string
  width: string
  height: string
  depth: string
  diameter: string
  price: string
  sku: string
  isActive: boolean
}

interface ImageRow {
  _key: string
  url: string
  altText_he: string
  altText_en: string
  sortOrder: number
  isPrimary: boolean
  uploading?: boolean
}

interface PricingRule {
  pricePerCmWidth: string
  pricePerCmHeight: string
  pricePerCmDepth: string
  pricePerCmDiameter: string
  minWidth: string
  maxWidth: string
  minHeight: string
  maxHeight: string
  minDepth: string
  maxDepth: string
}

interface FormState {
  slug: string
  name_he: string
  name_en: string
  description_he: string
  description_en: string
  category: string
  basePrice: string
  customizable: boolean
  isActive: boolean
  isFeatured: boolean
  sortOrder: string
  variants: VariantRow[]
  pricingRule: PricingRule
  colorIds: string[]
  images: ImageRow[]
}

const emptyVariant = (): VariantRow => ({
  _key: Math.random().toString(36).slice(2),
  name_he: '',
  name_en: '',
  width: '',
  height: '',
  depth: '',
  diameter: '',
  price: '',
  sku: '',
  isActive: true,
})

const emptyPricing = (): PricingRule => ({
  pricePerCmWidth: '',
  pricePerCmHeight: '',
  pricePerCmDepth: '',
  pricePerCmDiameter: '',
  minWidth: '',
  maxWidth: '',
  minHeight: '',
  maxHeight: '',
  minDepth: '',
  maxDepth: '',
})

const emptyForm = (): FormState => ({
  slug: '',
  name_he: '',
  name_en: '',
  description_he: '',
  description_en: '',
  category: 'TABLE',
  basePrice: '',
  customizable: false,
  isActive: true,
  isFeatured: false,
  sortOrder: '0',
  variants: [emptyVariant()],
  pricingRule: emptyPricing(),
  colorIds: [],
  images: [],
})

function productToForm(p: ProductDTO): FormState {
  return {
    slug: p.slug,
    name_he: p.name_he,
    name_en: p.name_en,
    description_he: p.description_he,
    description_en: p.description_en,
    category: p.category,
    basePrice: String(p.basePrice),
    customizable: p.customizable,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    sortOrder: String(p.sortOrder),
    variants:
      p.variants.length > 0
        ? p.variants.map((v) => ({
            _key: v.id,
            name_he: v.name_he,
            name_en: v.name_en,
            width: v.width != null ? String(v.width) : '',
            height: v.height != null ? String(v.height) : '',
            depth: v.depth != null ? String(v.depth) : '',
            diameter: v.diameter != null ? String(v.diameter) : '',
            price: String(v.price),
            sku: v.sku,
            isActive: v.isActive,
          }))
        : [emptyVariant()],
    pricingRule: p.customPricingRule
      ? {
          pricePerCmWidth:
            p.customPricingRule.pricePerCmWidth != null
              ? String(p.customPricingRule.pricePerCmWidth)
              : '',
          pricePerCmHeight:
            p.customPricingRule.pricePerCmHeight != null
              ? String(p.customPricingRule.pricePerCmHeight)
              : '',
          pricePerCmDepth:
            p.customPricingRule.pricePerCmDepth != null
              ? String(p.customPricingRule.pricePerCmDepth)
              : '',
          pricePerCmDiameter:
            p.customPricingRule.pricePerCmDiameter != null
              ? String(p.customPricingRule.pricePerCmDiameter)
              : '',
          minWidth:
            p.customPricingRule.minWidth != null ? String(p.customPricingRule.minWidth) : '',
          maxWidth:
            p.customPricingRule.maxWidth != null ? String(p.customPricingRule.maxWidth) : '',
          minHeight:
            p.customPricingRule.minHeight != null ? String(p.customPricingRule.minHeight) : '',
          maxHeight:
            p.customPricingRule.maxHeight != null ? String(p.customPricingRule.maxHeight) : '',
          minDepth:
            p.customPricingRule.minDepth != null ? String(p.customPricingRule.minDepth) : '',
          maxDepth:
            p.customPricingRule.maxDepth != null ? String(p.customPricingRule.maxDepth) : '',
        }
      : emptyPricing(),
    colorIds: p.colorOptions.map((c) => c.id),
    images: p.images.map((img) => ({
      _key: img.id,
      url: img.url,
      altText_he: img.altText_he,
      altText_en: img.altText_en,
      sortOrder: img.sortOrder,
      isPrimary: img.isPrimary,
    })),
  }
}

function num(s: string): number | undefined {
  const n = parseFloat(s)
  return isNaN(n) ? undefined : n
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  mode: 'create' | 'edit'
  productId?: string
}

export function ProductFormPage({ mode, productId }: Props) {
  const { token } = useAdminStore()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('basic')
  const [form, setForm] = useState<FormState>(emptyForm())
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [allColors, setAllColors] = useState<ColorOptionDTO[]>([])
  const [newColor, setNewColor] = useState({
    name_he: '',
    name_en: '',
    hexCode: '#8b6914',
    open: false,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing product
  useEffect(() => {
    if (mode !== 'edit' || !productId || !token) return
    api
      .get<{ product: ProductDTO }>(`/api/admin/products/${productId}`, token)
      .then(({ product }) => setForm(productToForm(product)))
      .catch(() => router.replace('/admin/products'))
      .finally(() => setLoading(false))
  }, [mode, productId, token, router])

  // Load all colors
  const loadColors = useCallback(() => {
    if (!token) return
    api
      .get<{ colors: ColorOptionDTO[] }>('/api/admin/colors', token)
      .then(({ colors }) => setAllColors(colors))
      .catch(() => {})
  }, [token])

  useEffect(() => {
    loadColors()
  }, [loadColors])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => {
      const copy = { ...e }
      delete copy[key]
      return copy
    })
  }

  function setVariant(key: string, field: keyof VariantRow, value: string | boolean) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => (v._key === key ? { ...v, [field]: value } : v)),
    }))
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] }))
  }

  function removeVariant(key: string) {
    setForm((f) => ({ ...f, variants: f.variants.filter((v) => v._key !== key) }))
  }

  function setPricingRule(field: keyof PricingRule, value: string) {
    setForm((f) => ({ ...f, pricingRule: { ...f.pricingRule, [field]: value } }))
  }

  // ── Image upload ─────────────────────────────────────────────────────────────

  async function handleImageFiles(files: FileList | null) {
    if (!files || !token) return
    for (const file of Array.from(files)) {
      const tempKey = Math.random().toString(36).slice(2)
      setForm((f) => ({
        ...f,
        images: [
          ...f.images,
          {
            _key: tempKey,
            url: '',
            altText_he: '',
            altText_en: '',
            sortOrder: f.images.length,
            isPrimary: f.images.length === 0,
            uploading: true,
          },
        ],
      }))
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        if (!res.ok) throw new Error('Upload failed')
        const { url } = await res.json()
        setForm((f) => ({
          ...f,
          images: f.images.map((img) =>
            img._key === tempKey ? { ...img, url, uploading: false } : img
          ),
        }))
      } catch {
        setForm((f) => ({ ...f, images: f.images.filter((img) => img._key !== tempKey) }))
      }
    }
  }

  function setImageField(key: string, field: keyof ImageRow, value: string | boolean | number) {
    setForm((f) => ({
      ...f,
      images: f.images.map((img) => (img._key === key ? { ...img, [field]: value } : img)),
    }))
  }

  function setPrimary(key: string) {
    setForm((f) => ({
      ...f,
      images: f.images.map((img) => ({ ...img, isPrimary: img._key === key })),
    }))
  }

  function removeImage(key: string) {
    setForm((f) => {
      const updated = f.images.filter((img) => img._key !== key)
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true
      }
      return { ...f, images: updated }
    })
  }

  function moveImage(key: string, dir: 'up' | 'down') {
    setForm((f) => {
      const arr = [...f.images]
      const idx = arr.findIndex((img) => img._key === key)
      if (idx === -1) return f
      const swap = dir === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= arr.length) return f
      ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
      return { ...f, images: arr.map((img, i) => ({ ...img, sortOrder: i })) }
    })
  }

  // ── Color actions ────────────────────────────────────────────────────────────

  async function handleCreateColor() {
    if (!token || !newColor.name_he || !newColor.name_en) return
    try {
      const { color } = await api.post<{ color: ColorOptionDTO }>(
        '/api/admin/colors',
        { name_he: newColor.name_he, name_en: newColor.name_en, hexCode: newColor.hexCode },
        token
      )
      setAllColors((cs) => [...cs, color])
      setForm((f) => ({ ...f, colorIds: [...f.colorIds, color.id] }))
      setNewColor({ name_he: '', name_en: '', hexCode: '#8b6914', open: false })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה ביצירת הצבע')
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.slug) e.slug = 'שדה חובה'
    if (!form.name_he) e.name_he = 'שדה חובה'
    if (!form.name_en) e.name_en = 'שדה חובה'
    if (!form.description_he) e.description_he = 'שדה חובה'
    if (!form.description_en) e.description_en = 'שדה חובה'
    if (!form.basePrice || isNaN(Number(form.basePrice))) e.basePrice = 'מחיר לא תקין'
    if (form.variants.length === 0) e.variants = 'יש להוסיף לפחות גרסה אחת'
    form.variants.forEach((v, i) => {
      if (!v.name_he) e[`variant_${i}_name_he`] = 'שדה חובה'
      if (!v.price) e[`variant_${i}_price`] = 'שדה חובה'
      if (!v.sku) e[`variant_${i}_sku`] = 'שדה חובה'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !token) return
    setSaving(true)
    setSuccessMsg(null)
    try {
      const payload = {
        slug: form.slug,
        name_he: form.name_he,
        name_en: form.name_en,
        description_he: form.description_he,
        description_en: form.description_en,
        category: form.category,
        basePrice: Number(form.basePrice),
        customizable: form.customizable,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        sortOrder: Number(form.sortOrder) || 0,
        variants: form.variants.map((v) => ({
          name_he: v.name_he,
          name_en: v.name_en,
          width: num(v.width),
          height: num(v.height),
          depth: num(v.depth),
          diameter: num(v.diameter),
          price: Number(v.price),
          sku: v.sku,
          isActive: v.isActive,
        })),
        customPricingRule: form.customizable
          ? {
              pricePerCmWidth: num(form.pricingRule.pricePerCmWidth),
              pricePerCmHeight: num(form.pricingRule.pricePerCmHeight),
              pricePerCmDepth: num(form.pricingRule.pricePerCmDepth),
              pricePerCmDiameter: num(form.pricingRule.pricePerCmDiameter),
              minWidth: num(form.pricingRule.minWidth),
              maxWidth: num(form.pricingRule.maxWidth),
              minHeight: num(form.pricingRule.minHeight),
              maxHeight: num(form.pricingRule.maxHeight),
              minDepth: num(form.pricingRule.minDepth),
              maxDepth: num(form.pricingRule.maxDepth),
            }
          : undefined,
        images: form.images
          .filter((img) => img.url)
          .map((img, i) => ({
            url: img.url,
            altText_he: img.altText_he || form.name_he,
            altText_en: img.altText_en || form.name_en,
            sortOrder: i,
            isPrimary: img.isPrimary,
          })),
        colorIds: form.colorIds,
      }

      if (mode === 'create') {
        const { product } = await api.post<{ product: ProductDTO }>(
          '/api/admin/products',
          payload,
          token
        )
        setSuccessMsg('המוצר נוצר בהצלחה')
        setTimeout(() => router.push(`/admin/products/${product.id}/edit`), 1000)
      } else {
        await api.put(`/api/admin/products/${productId}`, payload, token)
        setSuccessMsg('השינויים נשמרו בהצלחה')
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    } catch (err) {
      setErrors({ _global: err instanceof Error ? err.message : 'שגיאה בשמירה' })
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="טוען..."
        />
      </div>
    )
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'basic', label: 'פרטים בסיסיים' },
    { id: 'variants', label: `גרסאות (${form.variants.length})` },
    { id: 'pricing', label: 'תמחור מותאם' },
    { id: 'colors', label: `צבעים (${form.colorIds.length})` },
    { id: 'images', label: `תמונות (${form.images.length})` },
  ]

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-text-muted hover:bg-secondary transition-colors cursor-pointer"
          aria-label="חזרה לרשימת המוצרים"
        >
          <ArrowRight size={16} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-text-main">
            {mode === 'create' ? 'מוצר חדש' : form.name_he || 'עריכת מוצר'}
          </h2>
          {mode === 'edit' && <p className="text-xs text-text-muted mt-0.5">{form.slug}</p>}
        </div>
        {successMsg && (
          <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
            <Check size={14} aria-hidden="true" /> {successMsg}
          </span>
        )}
        {errors._global && (
          <span className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
            {errors._global}
          </span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Save size={15} aria-hidden="true" />
          {saving ? 'שומר...' : 'שמור'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6 overflow-x-auto">
        <nav className="flex gap-1 min-w-max" aria-label="טאבים של טופס המוצר" role="tablist">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={[
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer',
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main hover:border-border',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Basic Info ──────────────────────────────────────── */}
      {tab === 'basic' && (
        <div className="space-y-6 max-w-2xl">
          <FieldRow label="Slug (URL)" error={errors.slug} required>
            <input
              type="text"
              value={form.slug}
              onChange={(e) =>
                set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
              }
              placeholder="sofa-oak-natural"
              dir="ltr"
              className={inputCls(!!errors.slug)}
            />
            <p className="text-xs text-text-muted mt-1">אותיות קטנות, מספרים ומקפים בלבד</p>
          </FieldRow>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="שם המוצר (עברית)" error={errors.name_he} required>
              <input
                type="text"
                value={form.name_he}
                onChange={(e) => set('name_he', e.target.value)}
                className={inputCls(!!errors.name_he)}
              />
            </FieldRow>
            <FieldRow label="Product Name (English)" error={errors.name_en} required>
              <input
                type="text"
                value={form.name_en}
                onChange={(e) => set('name_en', e.target.value)}
                dir="ltr"
                className={inputCls(!!errors.name_en)}
              />
            </FieldRow>
          </div>

          <FieldRow label="תיאור (עברית)" error={errors.description_he} required>
            <textarea
              value={form.description_he}
              onChange={(e) => set('description_he', e.target.value)}
              rows={4}
              className={inputCls(!!errors.description_he) + ' resize-y'}
            />
          </FieldRow>

          <FieldRow label="Description (English)" error={errors.description_en} required>
            <textarea
              value={form.description_en}
              onChange={(e) => set('description_en', e.target.value)}
              dir="ltr"
              rows={4}
              className={inputCls(!!errors.description_en) + ' resize-y'}
            />
          </FieldRow>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldRow label="קטגוריה" required>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className={inputCls(false)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="מחיר בסיס (₪)" error={errors.basePrice} required>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={(e) => set('basePrice', e.target.value)}
                className={inputCls(!!errors.basePrice)}
                dir="ltr"
              />
            </FieldRow>
            <FieldRow label="סדר מיון">
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', e.target.value)}
                className={inputCls(false)}
                dir="ltr"
              />
            </FieldRow>
          </div>

          <div className="flex flex-wrap gap-6">
            <Toggle
              label="מוצר פעיל"
              checked={form.isActive}
              onChange={(v) => set('isActive', v)}
            />
            <Toggle
              label="מוצר מומלץ"
              checked={form.isFeatured}
              onChange={(v) => set('isFeatured', v)}
            />
            <Toggle
              label="ניתן להתאמה אישית"
              checked={form.customizable}
              onChange={(v) => set('customizable', v)}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Variants ────────────────────────────────────────── */}
      {tab === 'variants' && (
        <div className="space-y-4">
          {errors.variants && <p className="text-sm text-red-600">{errors.variants}</p>}

          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-bg border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wide">
                    {[
                      'שם (עברית)',
                      'שם (אנגלית)',
                      'רוחב',
                      'גובה',
                      'עומק',
                      'מחיר ₪',
                      'SKU',
                      'פעיל',
                      '',
                    ].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-start whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((v, i) => (
                    <tr key={v._key} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={v.name_he}
                          onChange={(e) => setVariant(v._key, 'name_he', e.target.value)}
                          placeholder="קטן"
                          className={`${inputCls(!!errors[`variant_${i}_name_he`])} text-xs`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={v.name_en}
                          dir="ltr"
                          onChange={(e) => setVariant(v._key, 'name_en', e.target.value)}
                          placeholder="Small"
                          className={`${inputCls(false)} text-xs`}
                        />
                      </td>
                      {(['width', 'height', 'depth'] as const).map((dim) => (
                        <td key={dim} className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={v[dim]}
                            onChange={(e) => setVariant(v._key, dim, e.target.value)}
                            placeholder="ס״מ"
                            dir="ltr"
                            className={`${inputCls(false)} text-xs w-20`}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={v.price}
                          dir="ltr"
                          onChange={(e) => setVariant(v._key, 'price', e.target.value)}
                          placeholder="0"
                          className={`${inputCls(!!errors[`variant_${i}_price`])} text-xs w-24`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={v.sku}
                          dir="ltr"
                          onChange={(e) => setVariant(v._key, 'sku', e.target.value)}
                          placeholder="SKU-001"
                          className={`${inputCls(!!errors[`variant_${i}_sku`])} text-xs w-28`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={v.isActive}
                          onChange={(e) => setVariant(v._key, 'isActive', e.target.checked)}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeVariant(v._key)}
                          disabled={form.variants.length === 1}
                          title="הסר גרסה"
                          className="p-1.5 rounded text-text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
          >
            <Plus size={15} aria-hidden="true" /> הוסף גרסה
          </button>
        </div>
      )}

      {/* ── Tab: Pricing Rule ────────────────────────────────────── */}
      {tab === 'pricing' && (
        <div className="space-y-6 max-w-2xl">
          {!form.customizable && (
            <div className="bg-secondary border border-border rounded-lg p-4 text-sm text-text-muted">
              תמחור מותאם אישי זמין רק כאשר &quot;ניתן להתאמה אישית&quot; מסומן בלשונית הפרטים
              הבסיסיים.
            </div>
          )}

          <fieldset disabled={!form.customizable} className="space-y-5">
            <legend className="sr-only">כללי תמחור לפי מידות</legend>
            <div>
              <h3 className="text-sm font-semibold text-text-main mb-3">מחיר לס&quot;מ</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(
                  [
                    ['pricePerCmWidth', 'רוחב'],
                    ['pricePerCmHeight', 'גובה'],
                    ['pricePerCmDepth', 'עומק'],
                    ['pricePerCmDiameter', 'קוטר'],
                  ] as const
                ).map(([field, label]) => (
                  <FieldRow key={field} label={`${label} (₪/ס״מ)`}>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={form.pricingRule[field]}
                      onChange={(e) => setPricingRule(field, e.target.value)}
                      dir="ltr"
                      className={inputCls(false)}
                    />
                  </FieldRow>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-main mb-3">מגבלות מידות (ס&quot;מ)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(
                  [
                    ['minWidth', 'רוחב מינ.'],
                    ['maxWidth', 'רוחב מקס.'],
                    ['minHeight', 'גובה מינ.'],
                    ['maxHeight', 'גובה מקס.'],
                    ['minDepth', 'עומק מינ.'],
                    ['maxDepth', 'עומק מקס.'],
                  ] as const
                ).map(([field, label]) => (
                  <FieldRow key={field} label={label}>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.pricingRule[field]}
                      onChange={(e) => setPricingRule(field, e.target.value)}
                      dir="ltr"
                      className={inputCls(false)}
                    />
                  </FieldRow>
                ))}
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {/* ── Tab: Colors ──────────────────────────────────────────── */}
      {tab === 'colors' && (
        <div className="space-y-5 max-w-lg">
          <p className="text-sm text-text-muted">בחרו צבעים מהרשימה הקיימת או צרו צבע חדש.</p>

          {/* Existing colors */}
          <div className="flex flex-wrap gap-3">
            {allColors.map((color) => {
              const selected = form.colorIds.includes(color.id)
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() =>
                    set(
                      'colorIds',
                      selected
                        ? form.colorIds.filter((id) => id !== color.id)
                        : [...form.colorIds, color.id]
                    )
                  }
                  title={`${color.name_he} / ${color.name_en}`}
                  className={[
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer',
                    selected
                      ? 'border-primary bg-secondary text-primary font-medium shadow-sm'
                      : 'border-border bg-surface text-text-muted hover:border-primary/50',
                  ].join(' ')}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ background: color.hexCode }}
                    aria-hidden="true"
                  />
                  <span>{color.name_he}</span>
                  {selected && <Check size={12} className="text-primary" aria-label="נבחר" />}
                </button>
              )
            })}
            {allColors.length === 0 && (
              <p className="text-sm text-text-muted">אין צבעים קיימים עדיין</p>
            )}
          </div>

          {/* Create new color */}
          {newColor.open ? (
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-semibold text-text-main">צבע חדש</h4>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="שם (עברית)" required>
                  <input
                    type="text"
                    value={newColor.name_he}
                    onChange={(e) => setNewColor((n) => ({ ...n, name_he: e.target.value }))}
                    className={inputCls(false)}
                  />
                </FieldRow>
                <FieldRow label="Name (English)" required>
                  <input
                    type="text"
                    value={newColor.name_en}
                    dir="ltr"
                    onChange={(e) => setNewColor((n) => ({ ...n, name_en: e.target.value }))}
                    className={inputCls(false)}
                  />
                </FieldRow>
              </div>
              <FieldRow label="קוד צבע HEX" required>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newColor.hexCode}
                    onChange={(e) => setNewColor((n) => ({ ...n, hexCode: e.target.value }))}
                    className="w-12 h-10 p-1 rounded border border-border cursor-pointer"
                    aria-label="בוחר צבע"
                  />
                  <input
                    type="text"
                    value={newColor.hexCode}
                    dir="ltr"
                    onChange={(e) => setNewColor((n) => ({ ...n, hexCode: e.target.value }))}
                    className={`${inputCls(false)} flex-1`}
                    maxLength={7}
                  />
                </div>
              </FieldRow>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCreateColor}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Plus size={14} aria-hidden="true" /> יצירה
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewColor({ name_he: '', name_en: '', hexCode: '#8b6914', open: false })
                  }
                  className="px-4 py-2 text-sm border border-border rounded-lg text-text-muted hover:bg-bg transition-colors cursor-pointer"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNewColor((n) => ({ ...n, open: true }))}
              className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
            >
              <Plus size={15} aria-hidden="true" /> הוסף צבע חדש
            </button>
          )}
        </div>
      )}

      {/* ── Tab: Images ──────────────────────────────────────────── */}
      {tab === 'images' && (
        <div className="space-y-5">
          {/* Upload area */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleImageFiles(e.dataTransfer.files)
            }}
            role="button"
            tabIndex={0}
            aria-label="העלאת תמונות — לחצו או גררו קבצים לכאן"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
            }}
          >
            <Upload size={28} className="mx-auto text-text-muted mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-text-main">לחצו להעלאה או גררו תמונות</p>
            <p className="text-xs text-text-muted mt-1">JPG, PNG, WebP — עד 5MB לתמונה</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => handleImageFiles(e.target.files)}
              aria-label="בחירת תמונות להעלאה"
            />
          </div>

          {/* Images grid */}
          {form.images.length > 0 && (
            <div className="space-y-3">
              {form.images.map((img, i) => (
                <div
                  key={img._key}
                  className={`flex gap-4 bg-surface border rounded-lg p-3 items-start ${img.isPrimary ? 'border-primary' : 'border-border'}`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 shrink-0">
                    {img.uploading ? (
                      <div className="w-full h-full rounded-md bg-secondary border border-border flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : img.url ? (
                      <NextImage
                        src={img.url}
                        alt={img.altText_he || 'תמונת מוצר'}
                        width={80}
                        height={80}
                        className="w-full h-full rounded-md object-cover border border-border"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full rounded-md bg-secondary border border-border flex items-center justify-center text-text-muted">
                        <ImageIcon size={20} aria-hidden="true" />
                      </div>
                    )}
                    {img.isPrimary && (
                      <span className="absolute -top-1.5 -start-1.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ראשי
                      </span>
                    )}
                  </div>

                  {/* Alt text fields */}
                  <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">
                        טקסט חלופי (עברית)
                      </label>
                      <input
                        type="text"
                        value={img.altText_he}
                        onChange={(e) => setImageField(img._key, 'altText_he', e.target.value)}
                        placeholder={form.name_he}
                        className={`${inputCls(false)} text-xs`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">
                        Alt text (English)
                      </label>
                      <input
                        type="text"
                        value={img.altText_en}
                        dir="ltr"
                        onChange={(e) => setImageField(img._key, 'altText_en', e.target.value)}
                        placeholder={form.name_en}
                        className={`${inputCls(false)} text-xs`}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPrimary(img._key)}
                      disabled={img.isPrimary}
                      title={img.isPrimary ? 'תמונה ראשית' : 'הגדר כתמונה ראשית'}
                      className="p-1.5 rounded text-text-muted hover:text-primary hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {img.isPrimary ? (
                        <Star size={15} className="text-primary fill-primary" aria-hidden="true" />
                      ) : (
                        <StarOff size={15} aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(img._key, 'up')}
                      disabled={i === 0}
                      title="הזז למעלה"
                      className="p-1.5 rounded text-text-muted hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      aria-label="הזז תמונה למעלה"
                    >
                      <GripVertical size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(img._key)}
                      title="הסר תמונה"
                      className="p-1.5 rounded text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <XIcon size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    'w-full h-10 px-3 text-sm bg-bg border rounded-lg text-text-main',
    'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary',
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-border focus:border-primary',
  ].join(' ')
}

function FieldRow({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-main mb-1.5">
        {label}
        {required && (
          <span className="text-red-500 ms-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          checked ? 'bg-primary' : 'bg-border',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-[inset-inline-start] duration-200',
            checked ? 'start-5' : 'start-1',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>
      <span className="text-sm text-text-main">{label}</span>
    </label>
  )
}
