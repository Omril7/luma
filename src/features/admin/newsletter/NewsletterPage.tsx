'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Send,
  History,
  Search,
  Download,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Clock,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import { Select } from '@/components/ui/Select'
import { IsraelFlag, USAFlag } from '@/components/ui/LangFlags'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SubscriberDTO {
  id: string
  email: string
  name?: string
  language: string
  subscribedAt: string
  isActive: boolean
}

interface NewsletterSendDTO {
  id: string
  subject_he: string
  subject_en: string
  sentAt: string
  recipientCount: number
  targetLanguage?: string
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const labelCls = 'block text-xs font-medium text-text-muted mb-1'

const textareaCls =
  'w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// ── Tab definitions ───────────────────────────────────────────────────────────

type ActiveTab = 'subscribers' | 'send' | 'history'

const TABS: {
  key: ActiveTab
  label: string
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: 'true' }>
}[] = [
  { key: 'subscribers', label: 'מנויים', icon: Users },
  { key: 'send', label: 'שליחת ניוזלטר', icon: Send },
  { key: 'history', label: 'היסטוריית שליחות', icon: History },
]

// ── Root component ────────────────────────────────────────────────────────────

export function NewsletterPage() {
  const { token } = useAdminStore()
  const [activeTab, setActiveTab] = useState<ActiveTab>('subscribers')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-text-main">ניוזלטר</h2>
        <p className="text-sm text-text-muted mt-0.5">
          ניהול מנויים, שליחת ניוזלטר ועיון בהיסטוריה
        </p>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 bg-surface border border-border rounded-lg p-1"
        role="tablist"
        aria-label="ניווט ניוזלטר"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer min-h-[44px]',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:bg-secondary hover:text-text-main',
              ].join(' ')}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Panels */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'subscribers' && <SubscribersTab token={token ?? ''} />}
        {activeTab === 'send' && <SendTab token={token ?? ''} />}
        {activeTab === 'history' && <HistoryTab token={token ?? ''} />}
      </div>
    </div>
  )
}

// ── Subscribers Tab ────────────────────────────────────────────────────────────

function SubscribersTab({ token }: { token: string }) {
  const [subscribers, setSubscribers] = useState<SubscriberDTO[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState<'all' | 'he' | 'en'>('all')
  const [isActive, setIsActive] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [csvLoading, setCsvLoading] = useState(false)

  const fetchSubscribers = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search ? { search } : {}),
        ...(language !== 'all' ? { language } : {}),
        ...(isActive !== 'all' ? { isActive } : {}),
      })
      const data = await api.get<{
        data: SubscriberDTO[]
        total: number
        page: number
        pageSize: number
      }>(`/api/admin/newsletter?${params}`, token)
      setSubscribers(data.data)
      setTotal(data.total)
      setTotalPages(Math.max(1, Math.ceil(data.total / data.pageSize)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת המנויים')
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize, search, language, isActive])

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, language, isActive, pageSize])

  async function handleExportCSV() {
    if (!token) return
    setCsvLoading(true)
    try {
      const res = await fetch('/api/admin/newsletter?export=csv', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('שגיאה בייצוא')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'subscribers.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה בייצוא CSV')
    } finally {
      setCsvLoading(false)
    }
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="bg-surface border border-border rounded-lg p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute top-1/2 -translate-y-1/2 start-3 text-text-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי אימייל..."
            className="w-full h-10 ps-9 pe-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <Select
          value={language}
          onChange={(v) => setLanguage(v as 'all' | 'he' | 'en')}
          aria-label="סינון לפי שפה"
          options={[
            { value: 'all', label: 'כל השפות' },
            { value: 'he', label: 'עברית' },
            { value: 'en', label: 'English' },
          ]}
        />

        <Select
          value={isActive}
          onChange={(v) => setIsActive(v as 'all' | 'true' | 'false')}
          aria-label="סינון לפי סטטוס"
          options={[
            { value: 'all', label: 'כל הסטטוסים' },
            { value: 'true', label: 'פעיל' },
            { value: 'false', label: 'לא פעיל' },
          ]}
        />

        <Select
          value={String(pageSize)}
          onChange={(v) => setPageSize(Number(v))}
          aria-label="שורות לעמוד"
          options={[
            { value: '10', label: '10 בעמוד' },
            { value: '25', label: '25 בעמוד' },
            { value: '50', label: '50 בעמוד' },
          ]}
        />

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={csvLoading}
          className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-text-main bg-bg border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {csvLoading ? (
            <span
              className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin"
              role="status"
              aria-label="מייצא..."
            />
          ) : (
            <Download size={15} aria-hidden="true" />
          )}
          ייצוא CSV
        </button>
      </div>

      {/* Count */}
      <p className="text-sm text-text-muted">
        {loading ? 'טוען...' : `${start}–${end} מתוך ${total} מנויים`}
      </p>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                <div className="h-4 bg-secondary rounded w-52" />
                <div className="h-4 bg-secondary rounded w-24" />
                <div className="h-5 bg-secondary rounded-full w-14" />
                <div className="h-4 bg-secondary rounded w-24 ms-auto" />
                <div className="h-5 bg-secondary rounded-full w-12" />
              </div>
            ))}
          </div>
        ) : subscribers.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-sm">לא נמצאו מנויים</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-start px-4 py-3 font-medium text-text-muted whitespace-nowrap">
                    אימייל
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-text-muted whitespace-nowrap">
                    שם
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-text-muted whitespace-nowrap">
                    שפה
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-text-muted whitespace-nowrap">
                    תאריך הרשמה
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-text-muted whitespace-nowrap">
                    סטטוס
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-bg transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-text-main">{s.email}</td>
                    <td className="px-4 py-3 text-text-main">
                      {s.name ?? <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-main">
                        {s.language === 'he' ? (
                          <>
                            <IsraelFlag className="w-[18px] h-[12px] rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
                            עברית
                          </>
                        ) : (
                          <>
                            <USAFlag className="w-[18px] h-[12px] rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
                            English
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{formatDate(s.subscribedAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                          s.isActive
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {s.isActive ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="עמוד קודם"
            className="flex items-center gap-1 h-9 px-3 text-sm text-text-muted bg-surface border border-border rounded-lg hover:bg-secondary hover:text-text-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight size={16} aria-hidden="true" />
            הקודם
          </button>
          <span className="text-sm text-text-muted">
            עמוד {page} מתוך {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="עמוד הבא"
            className="flex items-center gap-1 h-9 px-3 text-sm text-text-muted bg-surface border border-border rounded-lg hover:bg-secondary hover:text-text-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            הבא
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Send Tab ──────────────────────────────────────────────────────────────────

interface SendForm {
  subject_he: string
  subject_en: string
  body_he: string
  body_en: string
  targetLanguage: 'all' | 'he' | 'en'
}

const TARGET_OPTIONS = [
  { value: 'all', label: 'כל המנויים הפעילים' },
  { value: 'he', label: 'מנויים עבריים בלבד' },
  { value: 'en', label: 'English subscribers only' },
] as const

function SendTab({ token }: { token: string }) {
  const [form, setForm] = useState<SendForm>({
    subject_he: '',
    subject_en: '',
    body_he: '',
    body_en: '',
    targetLanguage: 'all',
  })
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch live recipient count when target language changes
  useEffect(() => {
    if (!token) return
    setLoadingCount(true)
    const lang = form.targetLanguage
    const params = new URLSearchParams({
      pageSize: '1',
      isActive: 'true',
      ...(lang !== 'all' ? { language: lang } : {}),
    })
    api
      .get<{ total: number }>(`/api/admin/newsletter?${params}`, token)
      .then((data) => setRecipientCount(data.total))
      .catch(() => setRecipientCount(null))
      .finally(() => setLoadingCount(false))
  }, [token, form.targetLanguage])

  function setField<K extends keyof SendForm>(k: K, v: SendForm[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function isValid() {
    return (
      form.subject_he.trim().length > 0 &&
      form.subject_en.trim().length > 0 &&
      form.body_he.trim().length > 0 &&
      form.body_en.trim().length > 0
    )
  }

  async function handleSend() {
    if (!token) return
    setSending(true)
    setError(null)
    try {
      await api.post<{ sent: number }>(
        '/api/admin/newsletter/send',
        {
          subject_he: form.subject_he.trim(),
          subject_en: form.subject_en.trim(),
          body_he: form.body_he.trim(),
          body_en: form.body_en.trim(),
          ...(form.targetLanguage !== 'all' ? { targetLanguage: form.targetLanguage } : {}),
        },
        token
      )
      setShowConfirm(false)
      setSuccess(true)
      setForm({ subject_he: '', subject_en: '', body_he: '', body_en: '', targetLanguage: 'all' })
      setTimeout(() => setSuccess(false), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשליחת הניוזלטר')
      setShowConfirm(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {success && (
        <div
          role="status"
          className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"
        >
          <Check size={16} aria-hidden="true" />
          הניוזלטר נשלח בהצלחה לכל המנויים הפעילים!
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
        >
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Target audience */}
      <section className="bg-surface border border-border rounded-lg p-5">
        <h3 className="text-base font-semibold text-text-main mb-4">קהל יעד</h3>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="שפת קהל יעד">
          {TARGET_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className={[
                'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-colors min-h-[44px]',
                form.targetLanguage === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-bg text-text-muted hover:border-primary/50',
              ].join(' ')}
            >
              <input
                type="radio"
                name="targetLanguage"
                value={value}
                checked={form.targetLanguage === value}
                onChange={() => setField('targetLanguage', value)}
                className="sr-only"
              />
              {value === 'he' && (
                <IsraelFlag className="w-[18px] h-[12px] rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)] shrink-0" />
              )}
              {value === 'en' && (
                <USAFlag className="w-[18px] h-[12px] rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)] shrink-0" />
              )}
              {label}
            </label>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-3">
          {loadingCount
            ? 'מחשב...'
            : recipientCount !== null
              ? `${recipientCount} נמענים בסינון הנוכחי`
              : 'לא ניתן לחשב'}
        </p>
      </section>

      {/* Subject */}
      <section className="bg-surface border border-border rounded-lg p-5">
        <h3 className="text-base font-semibold text-text-main mb-4">נושא המייל</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              נושא{' '}
              <IsraelFlag className="inline-block w-[18px] h-[12px] rounded-[2px] ms-1.5 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
              <span className="text-red-500 ms-0.5" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              value={form.subject_he}
              onChange={(e) => setField('subject_he', e.target.value)}
              dir="rtl"
              placeholder="נושא המייל בעברית"
              required
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>
              Subject{' '}
              <USAFlag className="inline-block w-[18px] h-[12px] rounded-[2px] ms-1.5 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
              <span className="text-red-500 ms-0.5" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              value={form.subject_en}
              onChange={(e) => setField('subject_en', e.target.value)}
              dir="ltr"
              placeholder="Email subject in English"
              required
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="bg-surface border border-border rounded-lg p-5">
        <h3 className="text-base font-semibold text-text-main mb-4">גוף המייל</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              תוכן{' '}
              <IsraelFlag className="inline-block w-[18px] h-[12px] rounded-[2px] ms-1.5 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
              <span className="text-red-500 ms-0.5" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              value={form.body_he}
              onChange={(e) => setField('body_he', e.target.value)}
              dir="rtl"
              placeholder="תוכן הניוזלטר בעברית (HTML נתמך)"
              rows={12}
              required
              className={textareaCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>
              Content{' '}
              <USAFlag className="inline-block w-[18px] h-[12px] rounded-[2px] ms-1.5 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
              <span className="text-red-500 ms-0.5" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              value={form.body_en}
              onChange={(e) => setField('body_en', e.target.value)}
              dir="ltr"
              placeholder="Newsletter content in English (HTML supported)"
              rows={12}
              required
              className={textareaCls}
            />
          </div>
        </div>
        <p className="text-xs text-text-muted mt-2">
          HTML נתמך בגוף המייל. כל מנוי יקבל מייל בשפה שבחר בהרשמה.
        </p>
      </section>

      {/* Send CTA */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={!isValid()}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Send size={16} aria-hidden="true" />
          שלח ניוזלטר
        </button>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-newsletter-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirm(false)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3
              id="send-newsletter-dialog-title"
              className="text-base font-semibold text-text-main mb-2"
            >
              אישור שליחת ניוזלטר
            </h3>
            <p className="text-sm text-text-muted mb-5">
              {recipientCount !== null
                ? `הניוזלטר ישלח ל-${recipientCount} מנויים פעילים. פעולה זו אינה הפיכה.`
                : 'הניוזלטר ישלח לכל המנויים הפעילים. פעולה זו אינה הפיכה.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={sending}
                className="px-4 py-2 text-sm rounded-lg bg-bg border border-border text-text-main hover:bg-secondary transition-colors disabled:opacity-60 cursor-pointer min-h-[44px]"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer min-h-[44px]"
              >
                {sending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Send size={14} aria-hidden="true" />
                    כן, שלח
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab({ token }: { token: string }) {
  const [sends, setSends] = useState<NewsletterSendDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    api
      .get<{ sends: NewsletterSendDTO[] }>('/api/admin/newsletter/sends', token)
      .then((data) => setSends(data.sends))
      .catch((e) => setError(e instanceof Error ? e.message : 'שגיאה בטעינת ההיסטוריה'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-4 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary rounded w-64" />
                <div className="h-3 bg-secondary rounded w-48" />
              </div>
              <div className="space-y-2 text-end">
                <div className="h-3 bg-secondary rounded w-24" />
                <div className="h-5 bg-secondary rounded-full w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
        <AlertCircle size={16} aria-hidden="true" />
        {error}
      </div>
    )
  }

  if (sends.length === 0) {
    return (
      <div className="py-12 text-center text-text-muted text-sm bg-surface border border-border rounded-lg">
        עדיין לא נשלח אף ניוזלטר
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sends.map((s) => (
        <div
          key={s.id}
          className="bg-surface border border-border rounded-lg p-4 flex items-start gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-main truncate">{s.subject_he}</p>
            <p className="text-xs text-text-muted mt-0.5 truncate" dir="ltr">
              {s.subject_en}
            </p>
          </div>
          <div className="shrink-0 text-end space-y-1.5">
            <div className="flex items-center justify-end gap-1.5 text-xs text-text-muted">
              <Clock size={12} aria-hidden="true" />
              {formatDate(s.sentAt)}
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs font-medium text-text-main">{s.recipientCount} נמענים</span>
              {s.targetLanguage ? (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-text-muted border border-border">
                  {s.targetLanguage === 'he' ? (
                    <>
                      <IsraelFlag className="w-[14px] h-[9px] rounded-[2px]" />
                      עברית
                    </>
                  ) : (
                    <>
                      <USAFlag className="w-[14px] h-[9px] rounded-[2px]" />
                      English
                    </>
                  )}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-text-muted border border-border">
                  הכל
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
