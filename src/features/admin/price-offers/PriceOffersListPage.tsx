'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Check,
  RotateCcw,
  Trash2,
  ChevronRight,
  ChevronLeft,
  MessageSquareQuote,
  Phone,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import type { PriceOfferRequestDTO } from '@/shared/types'
import { Select } from '@/components/ui/Select'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

interface PriceOffersResponse {
  data: PriceOfferRequestDTO[]
  total: number
  page: number
  pageSize: number
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

/** 05x-xxxxxxx → 9725xxxxxxxx for wa.me links */
function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const intl = digits.startsWith('0') ? `972${digits.slice(1)}` : digits
  return `https://wa.me/${intl}`
}

function selectionSummary(r: PriceOfferRequestDTO): string {
  const parts: string[] = []
  if (r.isCustom) {
    const dims = [r.customWidth, r.customHeight, r.customDepth].filter((d) => d != null).join('×')
    parts.push(dims ? `מידות מותאמות: ${dims} ס"מ` : 'מידות מותאמות')
  } else if (r.variantName) {
    parts.push(r.variantName)
  }
  if (r.colorName) parts.push(r.colorName)
  if (r.quantity > 1) parts.push(`כמות: ${r.quantity}`)
  return parts.join(' · ') || '—'
}

export function PriceOffersListPage() {
  const { token } = useAdminStore()

  const [requests, setRequests] = useState<PriceOfferRequestDTO[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<'all' | 'NEW' | 'HANDLED'>('NEW')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(status !== 'all' ? { status } : {}),
      })
      const data = await api.get<PriceOffersResponse>(`/api/admin/price-offers?${params}`, token)
      setRequests(data.data)
      setTotal(data.total)
      setTotalPages(Math.max(1, Math.ceil(data.total / data.pageSize)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הבקשות')
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize, status])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    setPage(1)
  }, [status, pageSize])

  async function handleSetStatus(request: PriceOfferRequestDTO, newStatus: 'NEW' | 'HANDLED') {
    if (!token || updatingId) return
    setUpdatingId(request.id)
    setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: newStatus } : r)))
    try {
      await api.patch(`/api/admin/price-offers/${request.id}`, { status: newStatus }, token)
      fetchRequests()
    } catch (e) {
      setRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, status: request.status } : r))
      )
      alert(e instanceof Error ? e.message : 'שגיאה בעדכון הבקשה')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!token) return
    setDeleting(true)
    try {
      await api.delete(`/api/admin/price-offers/${id}`, token)
      setDeleteId(null)
      fetchRequests()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה במחיקה')
    } finally {
      setDeleting(false)
    }
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-main">הצעות מחיר</h2>
        <p className="text-sm text-text-muted mt-0.5">{total} בקשות סה&quot;כ</p>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-4 flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(v) => setStatus(v as 'all' | 'NEW' | 'HANDLED')}
          aria-label="סינון לפי סטטוס"
          options={[
            { value: 'NEW', label: 'חדשות' },
            { value: 'HANDLED', label: 'טופלו' },
            { value: 'all', label: 'הכל' },
          ]}
        />

        <Select
          value={String(pageSize)}
          onChange={(v) => setPageSize(Number(v))}
          aria-label="מספר שורות בעמוד"
          options={[10, 25, 50].map((n) => ({ value: String(n), label: `${n} בעמוד` }))}
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border-b border-border">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid" aria-label="רשימת בקשות להצעת מחיר">
            <thead>
              <tr className="border-b border-border bg-bg text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-start">מוצר</th>
                <th className="px-4 py-3 text-start">לקוח/ה</th>
                <th className="px-4 py-3 text-start">בחירה</th>
                <th className="px-4 py-3 text-start">הודעה</th>
                <th className="px-4 py-3 text-start">מחיר משוער</th>
                <th className="px-4 py-3 text-start">תאריך</th>
                <th className="px-4 py-3 text-center">סטטוס</th>
                <th className="px-4 py-3 text-end w-28">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-4 bg-secondary rounded animate-pulse"
                          style={{ width: j === 0 ? 100 : j === 3 ? 140 : 60 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <MessageSquareQuote
                        size={28}
                        className="text-text-muted"
                        aria-hidden="true"
                      />
                      <span>
                        {status === 'NEW' ? 'אין בקשות חדשות להצעת מחיר' : 'לא נמצאו בקשות'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors align-top"
                  >
                    {/* מוצר */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-main truncate max-w-40">
                        {request.productName_he}
                      </p>
                      <p className="text-xs text-text-muted truncate max-w-40">
                        {request.productName_en}
                      </p>
                    </td>

                    {/* לקוח */}
                    <td className="px-4 py-3">
                      <p className="text-text-main font-medium">{request.customerName}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <a
                          href={`tel:${request.phone}`}
                          title="חיוג"
                          aria-label={`חיוג אל ${request.customerName}`}
                          className="p-1.5 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors inline-flex items-center gap-1 text-xs"
                        >
                          <Phone size={13} aria-hidden="true" />
                          <span dir="ltr">{request.phone}</span>
                        </a>
                        <a
                          href={whatsappHref(request.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="פתיחת WhatsApp"
                          aria-label={`שליחת WhatsApp אל ${request.customerName}`}
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors inline-flex items-center justify-center"
                        >
                          <WhatsAppIcon size={14} aria-hidden="true" />
                        </a>
                      </div>
                      {request.email && (
                        <a
                          href={`mailto:${request.email}`}
                          className="block text-xs text-text-muted hover:text-primary truncate max-w-44"
                          dir="ltr"
                        >
                          {request.email}
                        </a>
                      )}
                    </td>

                    {/* בחירה */}
                    <td className="px-4 py-3 text-text-muted max-w-48">
                      <p className="line-clamp-3">{selectionSummary(request)}</p>
                    </td>

                    {/* הודעה */}
                    <td className="px-4 py-3 text-text-muted max-w-56">
                      <p className="line-clamp-3 whitespace-pre-line">{request.message || '—'}</p>
                    </td>

                    {/* מחיר משוער */}
                    <td className="px-4 py-3 text-text-main whitespace-nowrap tabular-nums">
                      {request.quotedPrice != null
                        ? `₪${request.quotedPrice.toLocaleString('he-IL')}`
                        : '—'}
                    </td>

                    {/* תאריך */}
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {formatDate(request.createdAt)}
                    </td>

                    {/* סטטוס */}
                    <td className="px-4 py-3 text-center">
                      {request.status === 'HANDLED' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          טופלה
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          חדשה
                        </span>
                      )}
                    </td>

                    {/* פעולות */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {request.status === 'HANDLED' ? (
                          <button
                            onClick={() => handleSetStatus(request, 'NEW')}
                            disabled={updatingId === request.id}
                            title="החזרה לחדשה"
                            aria-label="החזרה לחדשה"
                            className="p-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            <RotateCcw size={15} aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetStatus(request, 'HANDLED')}
                            disabled={updatingId === request.id}
                            title="סימון כטופלה"
                            aria-label="סימון כטופלה"
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            <Check size={15} aria-hidden="true" />
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteId(request.id)}
                          title="מחיקה"
                          aria-label="מחיקה"
                          className="p-2 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-4 text-sm">
            <p className="text-text-muted">
              מציג {start}–{end} מתוך {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="עמוד קודם"
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-text-muted hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={15} aria-hidden="true" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    aria-current={p === page ? 'page' : undefined}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors cursor-pointer ${
                      p === page
                        ? 'bg-primary text-white font-medium'
                        : 'border border-border text-text-muted hover:bg-secondary'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="עמוד הבא"
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-text-muted hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-offer-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3
              id="delete-offer-dialog-title"
              className="text-base font-semibold text-text-main mb-2"
            >
              מחיקת בקשה להצעת מחיר
            </h3>
            <p className="text-sm text-text-muted mb-6">פעולה זו אינה ניתנת לביטול.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg border border-border text-text-muted hover:bg-bg transition-colors cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {deleting ? 'מוחק...' : 'מחק בקשה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
