'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Check,
  RotateCcw,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Mail,
  Phone,
  Eye,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import type { ContactMessageDTO } from '@/shared/types'
import { Select } from '@/components/ui/Select'

interface ContactMessagesResponse {
  data: ContactMessageDTO[]
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

export function ContactMessagesListPage() {
  const { token } = useAdminStore()

  const [messages, setMessages] = useState<ContactMessageDTO[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<'all' | 'NEW' | 'READ'>('NEW')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [viewMessage, setViewMessage] = useState<ContactMessageDTO | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(status !== 'all' ? { status } : {}),
      })
      const data = await api.get<ContactMessagesResponse>(
        `/api/admin/contact-messages?${params}`,
        token
      )
      setMessages(data.data)
      setTotal(data.total)
      setTotalPages(Math.max(1, Math.ceil(data.total / data.pageSize)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת ההודעות')
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize, status])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    setPage(1)
  }, [status, pageSize])

  async function handleSetStatus(message: ContactMessageDTO, newStatus: 'NEW' | 'READ') {
    if (!token || updatingId) return
    setUpdatingId(message.id)
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, status: newStatus } : m)))
    try {
      await api.patch(`/api/admin/contact-messages/${message.id}`, { status: newStatus }, token)
      fetchMessages()
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, status: message.status } : m))
      )
      alert(e instanceof Error ? e.message : 'שגיאה בעדכון ההודעה')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!token) return
    setDeleting(true)
    try {
      await api.delete(`/api/admin/contact-messages/${id}`, token)
      setDeleteId(null)
      fetchMessages()
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
        <h2 className="text-xl font-bold text-text-main">הודעות יצירת קשר</h2>
        <p className="text-sm text-text-muted mt-0.5">{total} הודעות סה&quot;כ</p>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-4 flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(v) => setStatus(v as 'all' | 'NEW' | 'READ')}
          aria-label="סינון לפי סטטוס"
          options={[
            { value: 'NEW', label: 'חדשות' },
            { value: 'READ', label: 'נקראו' },
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
          <table className="w-full text-sm" role="grid" aria-label="רשימת הודעות יצירת קשר">
            <thead>
              <tr className="border-b border-border bg-bg text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-start">שולח/ת</th>
                <th className="px-4 py-3 text-start">נושא</th>
                <th className="px-4 py-3 text-start">הודעה</th>
                <th className="px-4 py-3 text-center">ניוזלטר</th>
                <th className="px-4 py-3 text-start">תאריך</th>
                <th className="px-4 py-3 text-center">סטטוס</th>
                <th className="px-4 py-3 text-end w-28">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-4 bg-secondary rounded animate-pulse"
                          style={{ width: j === 0 ? 100 : j === 2 ? 140 : 60 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <Mail size={28} className="text-text-muted" aria-hidden="true" />
                      <span>{status === 'NEW' ? 'אין הודעות חדשות' : 'לא נמצאו הודעות'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                messages.map((message) => (
                  <tr
                    key={message.id}
                    className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors align-top"
                  >
                    {/* שולח/ת */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-main truncate max-w-40">{message.name}</p>
                      <a
                        href={`mailto:${message.email}`}
                        className="mt-1 flex items-center gap-1 text-xs text-text-muted hover:text-primary truncate max-w-44"
                        dir="ltr"
                      >
                        <Mail size={12} aria-hidden="true" className="shrink-0" />
                        {message.email}
                      </a>
                      {message.phone && (
                        <a
                          href={`tel:${message.phone}`}
                          className="mt-0.5 flex items-center gap-1 text-xs text-text-muted hover:text-primary"
                          dir="ltr"
                        >
                          <Phone size={12} aria-hidden="true" className="shrink-0" />
                          {message.phone}
                        </a>
                      )}
                    </td>

                    {/* נושא */}
                    <td className="px-4 py-3 text-text-main max-w-40">
                      <p className="line-clamp-3">{message.subject}</p>
                    </td>

                    {/* הודעה */}
                    <td className="px-4 py-3 text-text-muted max-w-56">
                      <p className="line-clamp-3 whitespace-pre-line">{message.message}</p>
                    </td>

                    {/* ניוזלטר */}
                    <td className="px-4 py-3 text-center">
                      {message.subscribedToNewsletter ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          נרשם/ה
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>

                    {/* תאריך */}
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {formatDate(message.createdAt)}
                    </td>

                    {/* סטטוס */}
                    <td className="px-4 py-3 text-center">
                      {message.status === 'READ' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          נקראה
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
                        <button
                          onClick={() => setViewMessage(message)}
                          title="צפייה בהודעה"
                          aria-label="צפייה בהודעה"
                          className="p-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          <Eye size={15} aria-hidden="true" />
                        </button>

                        {message.status === 'READ' ? (
                          <button
                            onClick={() => handleSetStatus(message, 'NEW')}
                            disabled={updatingId === message.id}
                            title="החזרה לחדשה"
                            aria-label="החזרה לחדשה"
                            className="p-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            <RotateCcw size={15} aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetStatus(message, 'READ')}
                            disabled={updatingId === message.id}
                            title="סימון כנקראה"
                            aria-label="סימון כנקראה"
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            <Check size={15} aria-hidden="true" />
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteId(message.id)}
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

      {/* View message dialog */}
      {viewMessage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-message-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewMessage(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-border">
              <div>
                <h3
                  id="view-message-dialog-title"
                  className="text-base font-semibold text-text-main"
                >
                  {viewMessage.name}
                </h3>
                <p className="text-xs text-text-muted mt-1">{formatDate(viewMessage.createdAt)}</p>
              </div>
              <button
                onClick={() => setViewMessage(null)}
                title="סגירה"
                aria-label="סגירה"
                className="p-2 -m-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors cursor-pointer"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex flex-wrap gap-4 text-sm">
                <a
                  href={`mailto:${viewMessage.email}`}
                  className="flex items-center gap-1.5 text-text-muted hover:text-primary"
                  dir="ltr"
                >
                  <Mail size={14} aria-hidden="true" className="shrink-0" />
                  {viewMessage.email}
                </a>
                {viewMessage.phone && (
                  <a
                    href={`tel:${viewMessage.phone}`}
                    className="flex items-center gap-1.5 text-text-muted hover:text-primary"
                    dir="ltr"
                  >
                    <Phone size={14} aria-hidden="true" className="shrink-0" />
                    {viewMessage.phone}
                  </a>
                )}
                {viewMessage.subscribedToNewsletter && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    נרשם/ה לניוזלטר
                  </span>
                )}
                {viewMessage.status === 'READ' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    נקראה
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    חדשה
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                  נושא
                </p>
                <p className="text-sm text-text-main">{viewMessage.subject}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                  הודעה
                </p>
                <p className="text-sm text-text-main whitespace-pre-line">{viewMessage.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-message-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3
              id="delete-message-dialog-title"
              className="text-base font-semibold text-text-main mb-2"
            >
              מחיקת הודעה
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
                {deleting ? 'מוחק...' : 'מחק הודעה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
