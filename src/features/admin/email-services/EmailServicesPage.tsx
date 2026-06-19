'use client'

import { useEffect, useState, useCallback } from 'react'
import { Send, Settings, Mail, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmailSettings {
  id: string
  fromAddress: string
  fromName_he: string
  fromName_en: string
  replyTo: string | null
  updatedAt: string
}

interface SenderForm {
  fromAddress: string
  fromName_he: string
  fromName_en: string
  replyTo: string
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const labelCls = 'block text-xs font-medium text-text-muted mb-1'

// ── Main component ─────────────────────────────────────────────────────────────

export function EmailServicesPage() {
  const { token } = useAdminStore()

  // ── Sender settings state ────────────────────────────────────────────────
  const [form, setForm] = useState<SenderForm>({
    fromAddress: '',
    fromName_he: '',
    fromName_en: '',
    replyTo: '',
  })
  const [senderSaving, setSenderSaving] = useState(false)
  const [senderSuccess, setSenderSuccess] = useState(false)
  const [senderError, setSenderError] = useState<string | null>(null)

  // ── Test email state ──────────────────────────────────────────────────────
  const [testAddress, setTestAddress] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  // ── Loading ───────────────────────────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    if (!token) return
    setPageLoading(true)
    setLoadError(null)
    try {
      const data = await api.get<EmailSettings>('/api/admin/email-settings', token)
      setForm({
        fromAddress: data.fromAddress ?? '',
        fromName_he: data.fromName_he ?? '',
        fromName_en: data.fromName_en ?? '',
        replyTo: data.replyTo ?? '',
      })
      // Pre-fill test address with fromAddress
      setTestAddress(data.fromAddress ?? '')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'שגיאה בטעינת הגדרות המייל')
    } finally {
      setPageLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // ── Handlers ─────────────────────────────────────────────────────────────

  function setField<K extends keyof SenderForm>(k: K, v: SenderForm[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSaveSender() {
    if (!token) return
    setSenderSaving(true)
    setSenderSuccess(false)
    setSenderError(null)
    try {
      await api.put<EmailSettings>(
        '/api/admin/email-settings',
        {
          fromAddress: form.fromAddress.trim(),
          fromName_he: form.fromName_he.trim(),
          fromName_en: form.fromName_en.trim(),
          replyTo: form.replyTo.trim() || null,
        },
        token
      )
      setSenderSuccess(true)
      setTimeout(() => setSenderSuccess(false), 3000)
    } catch (e) {
      setSenderError(e instanceof Error ? e.message : 'שגיאה בשמירת ההגדרות')
    } finally {
      setSenderSaving(false)
    }
  }

  async function handleSendTest() {
    if (!token || !testAddress.trim()) return
    setTestSending(true)
    setTestSuccess(false)
    setTestError(null)
    try {
      await api.post<{ sent: boolean }>(
        '/api/admin/email-settings/test',
        { toAddress: testAddress.trim() },
        token
      )
      setTestSuccess(true)
      setTimeout(() => setTestSuccess(false), 3000)
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'שגיאה בשליחת המייל')
    } finally {
      setTestSending(false)
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────

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
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {loadError}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-main">שירותי דואר</h2>
        <p className="text-sm text-text-muted mt-0.5">הגדרות שולח ובדיקת שליחת מייל</p>
      </div>

      {/* ── Section 1: Sender Configuration ──────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} className="text-text-muted" aria-hidden="true" />
          <h3 className="text-base font-semibold text-text-main">הגדרות שולח</h3>
        </div>

        <div>
          <label className={labelCls}>
            כתובת שולח{' '}
            <span className="text-red-500 ms-0.5" aria-hidden="true">
              *
            </span>
          </label>
          <input
            type="email"
            value={form.fromAddress}
            onChange={(e) => setField('fromAddress', e.target.value)}
            dir="ltr"
            placeholder="noreply@example.com"
            required
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              שם שולח (עברית){' '}
              <span className="text-red-500 ms-0.5" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              value={form.fromName_he}
              onChange={(e) => setField('fromName_he', e.target.value)}
              dir="rtl"
              placeholder="לומה רהיטים"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              שם שולח (אנגלית){' '}
              <span className="text-red-500 ms-0.5" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              value={form.fromName_en}
              onChange={(e) => setField('fromName_en', e.target.value)}
              dir="ltr"
              placeholder="Luma Furniture"
              required
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Reply-To</label>
          <input
            type="email"
            value={form.replyTo}
            onChange={(e) => setField('replyTo', e.target.value)}
            dir="ltr"
            placeholder="support@example.com"
            className={inputCls}
          />
          <p className="text-xs text-text-muted mt-1">השאר ריק לשימוש בכתובת השולח</p>
        </div>

        <div className="flex items-center justify-between pt-1">
          {senderSuccess && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check size={12} aria-hidden="true" /> ההגדרות נשמרו בהצלחה
            </p>
          )}
          {senderError && !senderSuccess && <p className="text-xs text-red-600">{senderError}</p>}
          {!senderSuccess && !senderError && <span />}

          <button
            type="button"
            onClick={handleSaveSender}
            disabled={senderSaving}
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {senderSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Check size={14} aria-hidden="true" />
                שמור הגדרות
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── Section 2: Test Email ─────────────────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Send size={16} className="text-text-muted" aria-hidden="true" />
          <h3 className="text-base font-semibold text-text-main">שליחת מייל לבדיקה</h3>
        </div>

        <div>
          <label className={labelCls}>כתובת נמען</label>
          <input
            type="email"
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
            dir="ltr"
            placeholder="test@example.com"
            className={inputCls}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          {testSuccess && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check size={12} aria-hidden="true" /> המייל נשלח בהצלחה ✓
            </p>
          )}
          {testError && !testSuccess && <p className="text-xs text-red-600">{testError}</p>}
          {!testSuccess && !testError && <span />}

          <button
            type="button"
            onClick={handleSendTest}
            disabled={testSending || !testAddress.trim()}
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {testSending ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send size={14} aria-hidden="true" />
                שלח מייל בדיקה
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── Section 3: Provider Info (read-only) ─────────────────────────────── */}
      <section className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={16} className="text-text-muted" aria-hidden="true" />
          <h3 className="text-base font-semibold text-text-main">מידע על ספק המייל</h3>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-main font-medium">ספק:</span>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-text-muted border border-border">
                ConsoleEmailProvider (פיתוח)
              </span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              בסביבת פיתוח, מיילים מודפסים ל-console. בפרודקשן יש להגדיר{' '}
              <code className="text-xs bg-bg border border-border rounded px-1.5 py-0.5 font-mono text-text-main">
                EMAIL_PROVIDER=nodemailer
              </code>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
