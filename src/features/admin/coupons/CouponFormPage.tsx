'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import type { CouponDTO } from '@/shared/types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormState {
  code: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: string
  minOrderAmount: string
  maxUses: string
  validFrom: string
  validUntil: string
  singleUsePerCustomer: boolean
  firstOrderOnly: boolean
  autoApply: boolean
  isActive: boolean
}

const emptyForm = (): FormState => ({
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minOrderAmount: '',
  maxUses: '',
  validFrom: '',
  validUntil: '',
  singleUsePerCustomer: false,
  firstOrderOnly: false,
  autoApply: false,
  isActive: true,
})

function couponToForm(c: CouponDTO): FormState {
  return {
    code: c.code,
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    minOrderAmount: c.minOrderAmount != null ? String(c.minOrderAmount) : '',
    maxUses: c.maxUses != null ? String(c.maxUses) : '',
    validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
    validUntil: c.validUntil ? c.validUntil.slice(0, 10) : '',
    singleUsePerCustomer: c.singleUsePerCustomer ?? false,
    firstOrderOnly: c.firstOrderOnly ?? false,
    autoApply: c.autoApply ?? false,
    isActive: c.isActive ?? true,
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  helper,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  helper?: string
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
      {helper && !error && <p className="text-xs text-text-muted mt-1">{helper}</p>}
      {error && (
        <p className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function CheckboxRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary shrink-0 cursor-pointer accent-primary"
      />
      <span className="text-sm text-text-main leading-snug">
        {label}
        {description && <span className="block text-xs text-text-muted mt-0.5">{description}</span>}
      </span>
    </label>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  couponId?: string
}

export function CouponFormPage({ couponId }: Props) {
  const isEdit = !!couponId
  const { token } = useAdminStore()
  const router = useRouter()

  const [form, setForm] = useState<FormState>(emptyForm())
  const [usedCount, setUsedCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Load existing coupon for edit
  const loadCoupon = useCallback(async () => {
    if (!isEdit || !couponId || !token) return
    setLoading(true)
    try {
      const coupon = await api.get<CouponDTO>(`/api/admin/coupons/${couponId}`, token)
      setForm(couponToForm(coupon))
      setUsedCount(coupon.usedCount)
    } catch {
      router.replace('/admin/coupons')
    } finally {
      setLoading(false)
    }
  }, [isEdit, couponId, token, router])

  useEffect(() => {
    loadCoupon()
  }, [loadCoupon])

  // ── Field helpers ────────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => {
      const copy = { ...e }
      delete copy[key]
      return copy
    })
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.code.trim()) e.code = 'שדה חובה'
    else if (!/^[A-Z0-9_\-]+$/.test(form.code))
      e.code = 'אותיות גדולות באנגלית, ספרות, מקפים וקווים תחתונים בלבד'
    if (!form.discountValue || isNaN(Number(form.discountValue)) || Number(form.discountValue) <= 0)
      e.discountValue = 'ערך הנחה לא תקין'
    if (form.discountType === 'PERCENTAGE' && Number(form.discountValue) > 100)
      e.discountValue = 'אחוז הנחה לא יכול לעלות על 100'
    if (form.minOrderAmount && isNaN(Number(form.minOrderAmount))) e.minOrderAmount = 'ערך לא תקין'
    if (form.maxUses && isNaN(Number(form.maxUses))) e.maxUses = 'ערך לא תקין'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !token) return
    setSaving(true)
    setSuccessMsg(null)

    const payload = {
      code: form.code.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      validFrom: form.validFrom || null,
      validUntil: form.validUntil || null,
      singleUsePerCustomer: form.singleUsePerCustomer,
      firstOrderOnly: form.firstOrderOnly,
      autoApply: form.autoApply,
      isActive: form.isActive,
    }

    try {
      if (!isEdit) {
        await api.post<CouponDTO>('/api/admin/coupons', payload, token)
        setSuccessMsg('הקופון נוצר בהצלחה')
        setTimeout(() => router.push('/admin/coupons'), 900)
      } else {
        await api.patch<CouponDTO>(`/api/admin/coupons/${couponId}`, payload, token)
        setSuccessMsg('השינויים נשמרו בהצלחה')
        setTimeout(() => {
          setSuccessMsg(null)
          router.push('/admin/coupons')
        }, 900)
      }
    } catch (err) {
      setErrors({ _global: err instanceof Error ? err.message : 'שגיאה בשמירה' })
    } finally {
      setSaving(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────

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

  const discountSuffix = form.discountType === 'PERCENTAGE' ? '%' : '₪'

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => router.push('/admin/coupons')}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-text-muted hover:bg-secondary transition-colors cursor-pointer"
          aria-label="חזרה לרשימת הקופונים"
        >
          <ArrowRight size={16} aria-hidden="true" />
        </button>

        <div className="flex-1">
          <h2 className="text-xl font-bold text-text-main">
            {isEdit ? form.code || 'עריכת קופון' : 'קופון חדש'}
          </h2>
          {isEdit && usedCount !== null && (
            <p className="text-xs text-text-muted mt-0.5">נעשה שימוש {usedCount} פעמים</p>
          )}
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
          {saving ? 'שומר...' : isEdit ? 'שמור קופון' : 'יצירת קופון'}
        </button>
      </div>

      <div className="space-y-5 max-w-2xl">
        {/* ── Section: פרטי קופון ────────────────────────────────── */}
        <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-main mb-4">פרטי קופון</h3>

          <FieldRow
            label="קוד קופון"
            error={errors.code}
            required
            helper="אותיות גדולות באנגלית, ספרות, מקפים וקווים תחתונים בלבד"
          >
            <input
              type="text"
              value={form.code}
              onChange={(e) =>
                set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_\-]/g, ''))
              }
              placeholder="SUMMER20"
              dir="ltr"
              className={`${inputCls(!!errors.code)} font-mono uppercase tracking-wider`}
              maxLength={64}
            />
          </FieldRow>

          <FieldRow label="סוג הנחה" required>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="discountType"
                  value="PERCENTAGE"
                  checked={form.discountType === 'PERCENTAGE'}
                  onChange={() => set('discountType', 'PERCENTAGE')}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
                <span className="text-sm text-text-main">אחוז (%)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="discountType"
                  value="FIXED_AMOUNT"
                  checked={form.discountType === 'FIXED_AMOUNT'}
                  onChange={() => set('discountType', 'FIXED_AMOUNT')}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
                <span className="text-sm text-text-main">סכום קבוע (₪)</span>
              </label>
            </div>
          </FieldRow>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label={`ערך ההנחה (${discountSuffix})`} error={errors.discountValue} required>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => set('discountValue', e.target.value)}
                  placeholder={form.discountType === 'PERCENTAGE' ? '15' : '50'}
                  dir="rtl"
                  className={`${inputCls(!!errors.discountValue)} ps-8`}
                />
                <span className="absolute top-1/2 -translate-y-1/2 start-3 text-sm text-text-muted pointer-events-none">
                  {discountSuffix}
                </span>
              </div>
            </FieldRow>

            <FieldRow
              label="מינימום סכום הזמנה (₪)"
              error={errors.minOrderAmount}
              helper="השאר ריק ללא מינימום"
            >
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minOrderAmount}
                  onChange={(e) => set('minOrderAmount', e.target.value)}
                  placeholder="200"
                  dir="rtl"
                  className={`${inputCls(!!errors.minOrderAmount)} ps-8`}
                />
                <span className="absolute top-1/2 -translate-y-1/2 start-3 text-sm text-text-muted pointer-events-none">
                  ₪
                </span>
              </div>
            </FieldRow>
          </div>
        </section>

        {/* ── Section: מגבלות שימוש ──────────────────────────────── */}
        <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-main mb-4">מגבלות שימוש</h3>

          <FieldRow
            label="מספר שימושים מקסימלי"
            error={errors.maxUses}
            helper="השאר ריק לשימושים ללא הגבלה"
          >
            <input
              type="number"
              min="1"
              step="1"
              value={form.maxUses}
              onChange={(e) => set('maxUses', e.target.value)}
              placeholder="100"
              dir="ltr"
              className={inputCls(!!errors.maxUses)}
            />
          </FieldRow>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="תוקף מתאריך">
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => set('validFrom', e.target.value)}
                dir="ltr"
                className={inputCls(false)}
              />
            </FieldRow>

            <FieldRow label="תוקף עד תאריך">
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => set('validUntil', e.target.value)}
                dir="ltr"
                className={inputCls(false)}
              />
            </FieldRow>
          </div>
        </section>

        {/* ── Section: אפשרויות מיוחדות ──────────────────────────── */}
        <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-main mb-4">אפשרויות מיוחדות</h3>

          <CheckboxRow
            label="לקוח בודד יכול להשתמש פעם אחת בלבד"
            description="מגביל כל לקוח לשימוש יחיד בקופון זה"
            checked={form.singleUsePerCustomer}
            onChange={(v) => set('singleUsePerCustomer', v)}
          />

          <CheckboxRow
            label="לא בשימוש אם לקוח כבר ביצע הזמנה בעבר"
            description="הקופון תקף רק עבור לקוחות חדשים שלא רכשו בעבר"
            checked={form.firstOrderOnly}
            onChange={(v) => set('firstOrderOnly', v)}
          />

          <div className="space-y-2">
            <CheckboxRow
              label="הקופון מופעל אוטומטית, ללא צורך להזין קוד"
              description="הקופון יחול על כל הזמנה העומדת בתנאים"
              checked={form.autoApply}
              onChange={(v) => set('autoApply', v)}
            />
            {form.autoApply && (
              <div className="ms-7 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                הקופון יחול על כל הזמנה העומדת בתנאים
              </div>
            )}
          </div>

          <CheckboxRow
            label="קופון פעיל"
            description="קופון לא פעיל לא ניתן לשימוש"
            checked={form.isActive}
            onChange={(v) => set('isActive', v)}
          />
        </section>
      </div>
    </form>
  )
}
