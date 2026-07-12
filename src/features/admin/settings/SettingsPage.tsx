'use client'

import { useEffect, useState, useCallback } from 'react'
import { Building2, Truck, MapPin, Clock, Check, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import { IsraelFlag, USAFlag } from '@/components/ui/LangFlags'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SiteSettingsDTO {
  business: {
    businessName_he: string
    businessName_en: string
    address_he: string
    address_en: string
    phone: string
    whatsappNumber: string
    email: string
    hours_he: string
    hours_en: string
    instagramUrl: string
    facebookUrl: string
  }
  shipping: {
    shippingCostNational: number
    freeShippingAbove?: number
  }
  delivery: {
    studioAddress: string
    studioLat: number | null
    studioLng: number | null
    deliveryRatePerKm: number
    minDeliveryFee: number
    maxDeliveryFee: number
  }
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const labelCls = 'block text-xs font-medium text-text-muted mb-1'

// ── Save button helper ────────────────────────────────────────────────────────

function SaveButton({
  onClick,
  saving,
  success,
  error,
}: {
  onClick: () => void
  saving: boolean
  success: boolean
  error: string | null
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <div aria-live="polite">
        {success && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Check size={12} aria-hidden="true" /> נשמר בהצלחה
          </p>
        )}
        {error && !success && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle size={12} aria-hidden="true" /> {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={saving}
        className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {saving ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            שומר...
          </>
        ) : (
          <>
            <Check size={14} aria-hidden="true" />
            שמור
          </>
        )}
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { token } = useAdminStore()

  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Business form
  const [biz, setBiz] = useState({
    businessName_he: '',
    businessName_en: '',
    address_he: '',
    address_en: '',
    phone: '',
    whatsappNumber: '',
    email: '',
    hours_he: '',
    hours_en: '',
    instagramUrl: '',
    facebookUrl: '',
  })
  const [bizSaving, setBizSaving] = useState(false)
  const [bizSuccess, setBizSuccess] = useState(false)
  const [bizError, setBizError] = useState<string | null>(null)

  // Shipping form
  const [ship, setShip] = useState({
    shippingCostNational: 0,
    freeShippingAbove: '',
  })
  const [shipSaving, setShipSaving] = useState(false)
  const [shipSuccess, setShipSuccess] = useState(false)
  const [shipError, setShipError] = useState<string | null>(null)

  // Delivery distance form
  const [delivery, setDelivery] = useState({
    studioAddress: '',
    deliveryRatePerKm: 3,
    minDeliveryFee: 50,
    maxDeliveryFee: 0,
  })
  const [deliverySaving, setDeliverySaving] = useState(false)
  const [deliverySuccess, setDeliverySuccess] = useState(false)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    if (!token) return
    setPageLoading(true)
    setLoadError(null)
    try {
      const data = await api.get<{ settings: SiteSettingsDTO }>('/api/admin/settings', token)
      const { business, shipping, delivery: del } = data.settings
      setBiz({
        businessName_he: business.businessName_he,
        businessName_en: business.businessName_en,
        address_he: business.address_he,
        address_en: business.address_en,
        phone: business.phone,
        whatsappNumber: business.whatsappNumber,
        email: business.email,
        hours_he: business.hours_he,
        hours_en: business.hours_en,
        instagramUrl: business.instagramUrl,
        facebookUrl: business.facebookUrl,
      })
      setShip({
        shippingCostNational: shipping.shippingCostNational,
        freeShippingAbove:
          shipping.freeShippingAbove != null ? String(shipping.freeShippingAbove) : '',
      })
      if (del) {
        setDelivery({
          studioAddress: del.studioAddress ?? '',
          deliveryRatePerKm: del.deliveryRatePerKm ?? 3,
          minDeliveryFee: del.minDeliveryFee ?? 50,
          maxDeliveryFee: del.maxDeliveryFee ?? 0,
        })
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'שגיאה בטעינת ההגדרות')
    } finally {
      setPageLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  function setBizField<K extends keyof typeof biz>(k: K, v: (typeof biz)[K]) {
    setBiz((f) => ({ ...f, [k]: v }))
  }

  async function handleSaveBiz() {
    if (!token) return
    setBizSaving(true)
    setBizSuccess(false)
    setBizError(null)
    try {
      await api.put<{ settings: SiteSettingsDTO }>(
        '/api/admin/settings',
        {
          businessName_he: biz.businessName_he.trim(),
          businessName_en: biz.businessName_en.trim(),
          address_he: biz.address_he.trim(),
          address_en: biz.address_en.trim(),
          phone: biz.phone.trim(),
          whatsappNumber: biz.whatsappNumber.trim(),
          email: biz.email.trim(),
          hours_he: biz.hours_he.trim(),
          hours_en: biz.hours_en.trim(),
          instagramUrl: biz.instagramUrl.trim(),
          facebookUrl: biz.facebookUrl.trim(),
        },
        token
      )
      setBizSuccess(true)
      setTimeout(() => setBizSuccess(false), 3000)
    } catch (e) {
      setBizError(e instanceof Error ? e.message : 'שגיאה בשמירה')
    } finally {
      setBizSaving(false)
    }
  }

  async function handleSaveShip() {
    if (!token) return
    setShipSaving(true)
    setShipSuccess(false)
    setShipError(null)
    try {
      const cost = parseFloat(String(ship.shippingCostNational))
      const freeAbove =
        ship.freeShippingAbove !== '' ? parseFloat(ship.freeShippingAbove) : undefined

      if (isNaN(cost) || cost < 0) {
        setShipError('עלות משלוח לא תקינה')
        return
      }
      if (freeAbove !== undefined && isNaN(freeAbove)) {
        setShipError('סף משלוח חינם לא תקין')
        return
      }

      await api.put<{ settings: SiteSettingsDTO }>(
        '/api/admin/settings',
        {
          shippingCostNational: cost,
          ...(freeAbove !== undefined ? { freeShippingAbove: freeAbove } : {}),
        },
        token
      )
      setShipSuccess(true)
      setTimeout(() => setShipSuccess(false), 3000)
    } catch (e) {
      setShipError(e instanceof Error ? e.message : 'שגיאה בשמירה')
    } finally {
      setShipSaving(false)
    }
  }

  async function handleSaveDelivery() {
    if (!token) return
    setDeliverySaving(true)
    setDeliverySuccess(false)
    setDeliveryError(null)
    try {
      const rate = delivery.deliveryRatePerKm
      const minFee = delivery.minDeliveryFee
      const maxFee = delivery.maxDeliveryFee

      if (isNaN(rate) || rate < 0) {
        setDeliveryError('תעריף לק"מ לא תקין')
        return
      }
      if (isNaN(minFee) || minFee < 0) {
        setDeliveryError('מינימום חיוב לא תקין')
        return
      }

      await api.put<{ settings: SiteSettingsDTO }>(
        '/api/admin/settings',
        {
          studioAddress: delivery.studioAddress.trim(),
          deliveryRatePerKm: rate,
          minDeliveryFee: minFee,
          maxDeliveryFee: maxFee,
        },
        token
      )
      setDeliverySuccess(true)
      setTimeout(() => setDeliverySuccess(false), 3000)
    } catch (e) {
      setDeliveryError(e instanceof Error ? e.message : 'שגיאה בשמירה')
    } finally {
      setDeliverySaving(false)
    }
  }

  if (pageLoading) {
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

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
        <AlertCircle size={16} aria-hidden="true" />
        {loadError}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-text-main">הגדרות</h2>
        <p className="text-sm text-text-muted mt-0.5">פרטי עסק, מידע יצירת קשר ועלויות משלוח</p>
      </div>

      {/* ── Business Info ─────────────────────────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-text-muted" aria-hidden="true" />
          <h3 className="text-base font-semibold text-text-main">פרטי העסק</h3>
        </div>

        {/* Bilingual business name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              שם העסק{' '}
              <IsraelFlag className="inline-block w-[14px] h-[9px] rounded-[2px] ms-1 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
            </label>
            <input
              type="text"
              value={biz.businessName_he}
              onChange={(e) => setBizField('businessName_he', e.target.value)}
              dir="rtl"
              placeholder="לומה רהיטים"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>
              Business name{' '}
              <USAFlag className="inline-block w-[14px] h-[9px] rounded-[2px] ms-1 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
            </label>
            <input
              type="text"
              value={biz.businessName_en}
              onChange={(e) => setBizField('businessName_en', e.target.value)}
              dir="ltr"
              placeholder="Luma Furniture"
              className={inputCls}
            />
          </div>
        </div>

        {/* Bilingual address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              כתובת{' '}
              <IsraelFlag className="inline-block w-[14px] h-[9px] rounded-[2px] ms-1 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
            </label>
            <input
              type="text"
              value={biz.address_he}
              onChange={(e) => setBizField('address_he', e.target.value)}
              dir="rtl"
              placeholder="תל אביב, ישראל"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>
              Address{' '}
              <USAFlag className="inline-block w-[14px] h-[9px] rounded-[2px] ms-1 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
            </label>
            <input
              type="text"
              value={biz.address_en}
              onChange={(e) => setBizField('address_en', e.target.value)}
              dir="ltr"
              placeholder="Tel Aviv, Israel"
              className={inputCls}
            />
          </div>
        </div>

        {/* Contact fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>טלפון</label>
            <input
              type="tel"
              value={biz.phone}
              onChange={(e) => setBizField('phone', e.target.value)}
              dir="ltr"
              placeholder="050-0000000"
              className={inputCls}
              autoComplete="tel"
            />
          </div>
          <div>
            <label className={labelCls}>מספר WhatsApp</label>
            <input
              type="tel"
              value={biz.whatsappNumber}
              onChange={(e) => setBizField('whatsappNumber', e.target.value)}
              dir="ltr"
              placeholder="972500000000"
              className={inputCls}
              autoComplete="tel"
            />
            <p className="text-xs text-text-muted mt-1">
              כולל קידומת מדינה, ללא + (לדוגמה: 972501234567)
            </p>
          </div>
        </div>

        <div>
          <label className={labelCls}>אימייל</label>
          <input
            type="email"
            value={biz.email}
            onChange={(e) => setBizField('email', e.target.value)}
            dir="ltr"
            placeholder="info@luma.co.il"
            className={inputCls}
            autoComplete="email"
          />
        </div>

        {/* Bilingual working hours */}
        <div className="flex items-center gap-2 pt-2">
          <Clock size={14} className="text-text-muted" aria-hidden="true" />
          <span className="text-xs font-medium text-text-muted">שעות פעילות</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              שעות פעילות{' '}
              <IsraelFlag className="inline-block w-[14px] h-[9px] rounded-[2px] ms-1 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
            </label>
            <input
              type="text"
              value={biz.hours_he}
              onChange={(e) => setBizField('hours_he', e.target.value)}
              dir="rtl"
              placeholder="א׳-ה׳: 9:00-18:00, ו׳: 9:00-13:00"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>
              Working hours{' '}
              <USAFlag className="inline-block w-[14px] h-[9px] rounded-[2px] ms-1 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
            </label>
            <input
              type="text"
              value={biz.hours_en}
              onChange={(e) => setBizField('hours_en', e.target.value)}
              dir="ltr"
              placeholder="Sun-Thu: 9AM-6PM, Fri: 9AM-1PM"
              className={inputCls}
            />
          </div>
        </div>

        {/* Social links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div dir="ltr">
            <label className={labelCls}>Instagram</label>
            <input
              type="url"
              value={biz.instagramUrl}
              onChange={(e) => setBizField('instagramUrl', e.target.value)}
              dir="ltr"
              placeholder="https://instagram.com/luma.furniture"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>Facebook</label>
            <input
              type="url"
              value={biz.facebookUrl}
              onChange={(e) => setBizField('facebookUrl', e.target.value)}
              dir="ltr"
              placeholder="https://facebook.com/luma.furniture"
              className={inputCls}
            />
          </div>
        </div>

        <SaveButton
          onClick={handleSaveBiz}
          saving={bizSaving}
          success={bizSuccess}
          error={bizError}
        />
      </section>

      {/* ── Shipping Costs ────────────────────────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-text-muted" aria-hidden="true" />
          <h3 className="text-base font-semibold text-text-main">עלויות משלוח</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>עלות משלוח ארצי (₪)</label>
            <div className="relative">
              <span className="absolute top-1/2 -translate-y-1/2 start-3 text-sm text-text-muted pointer-events-none">
                ₪
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={ship.shippingCostNational}
                onChange={(e) =>
                  setShip((s) => ({ ...s, shippingCostNational: parseFloat(e.target.value) || 0 }))
                }
                dir="rtl"
                className={`${inputCls} ps-8`}
              />
            </div>
            <p className="text-xs text-text-muted mt-1">עלות משלוח סטנדרטי לכל הארץ</p>
          </div>

          <div>
            <label className={labelCls}>סף משלוח חינם (₪, אופציונלי)</label>
            <div className="relative">
              <span className="absolute top-1/2 -translate-y-1/2 start-3 text-sm text-text-muted pointer-events-none">
                ₪
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={ship.freeShippingAbove}
                onChange={(e) => setShip((s) => ({ ...s, freeShippingAbove: e.target.value }))}
                dir="rtl"
                placeholder="ריק = אין משלוח חינם"
                className={`${inputCls} ps-8`}
              />
            </div>
            <p className="text-xs text-text-muted mt-1">השאר ריק אם אין הטבת משלוח חינם</p>
          </div>
        </div>

        <SaveButton
          onClick={handleSaveShip}
          saving={shipSaving}
          success={shipSuccess}
          error={shipError}
        />
      </section>

      {/* ── Delivery Distance ─────────────────────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-text-muted" aria-hidden="true" />
          <h3 className="text-base font-semibold text-text-main">משלוח לפי מרחק (ORS)</h3>
        </div>
        <p className="text-xs text-text-muted">
          עלות המשלוח מחושבת לפי מרחק כביש ממיקום הסטודיו לכתובת הלקוח.
        </p>

        <div>
          <label className={labelCls}>כתובת הסטודיו (נקודת מוצא)</label>
          <input
            type="text"
            value={delivery.studioAddress}
            onChange={(e) => setDelivery((s) => ({ ...s, studioAddress: e.target.value }))}
            placeholder="רחוב המלאכה 5, תל אביב"
            className={inputCls}
            dir="rtl"
          />
          <p className="text-xs text-text-muted mt-1">
            תיאוחל לקואורדינטות בשמירה — ודאו שהכתובת מדויקת
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{'תעריף (₪ לק"מ)'}</label>
            <div className="relative">
              <span className="absolute top-1/2 -translate-y-1/2 start-3 text-sm text-text-muted pointer-events-none">
                ₪
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={delivery.deliveryRatePerKm}
                onChange={(e) =>
                  setDelivery((s) => ({ ...s, deliveryRatePerKm: parseFloat(e.target.value) || 0 }))
                }
                dir="rtl"
                className={`${inputCls} ps-8`}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>מינימום חיוב (₪)</label>
            <div className="relative">
              <span className="absolute top-1/2 -translate-y-1/2 start-3 text-sm text-text-muted pointer-events-none">
                ₪
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={delivery.minDeliveryFee}
                onChange={(e) =>
                  setDelivery((s) => ({ ...s, minDeliveryFee: parseFloat(e.target.value) || 0 }))
                }
                dir="rtl"
                className={`${inputCls} ps-8`}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>מקסימום חיוב (₪, 0 = ללא הגבלה)</label>
            <div className="relative">
              <span className="absolute top-1/2 -translate-y-1/2 start-3 text-sm text-text-muted pointer-events-none">
                ₪
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={delivery.maxDeliveryFee}
                onChange={(e) =>
                  setDelivery((s) => ({ ...s, maxDeliveryFee: parseFloat(e.target.value) || 0 }))
                }
                dir="rtl"
                className={`${inputCls} ps-8`}
              />
            </div>
            <p className="text-xs text-text-muted mt-1">0 = ללא תקרה</p>
          </div>
        </div>

        <SaveButton
          onClick={handleSaveDelivery}
          saving={deliverySaving}
          success={deliverySuccess}
          error={deliveryError}
        />
      </section>
    </div>
  )
}
