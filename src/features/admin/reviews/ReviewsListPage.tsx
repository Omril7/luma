'use client'

import { useEffect, useState, useCallback } from 'react'
import { Check, X, Trash2, ChevronRight, ChevronLeft, Star, Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import type { ReviewDTO } from '@/shared/types'
import { Select } from '@/components/ui/Select'
import { StarRating } from '@/components/ui/StarRating'

interface ReviewsResponse {
  data: ReviewDTO[]
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

export function ReviewsListPage() {
  const { token } = useAdminStore()

  const [reviews, setReviews] = useState<ReviewDTO[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<'all' | 'pending' | 'approved'>('pending')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [editingReview, setEditingReview] = useState<ReviewDTO | null>(null)
  const [editDraft, setEditDraft] = useState({ comment_he: '', comment_en: '' })
  const [savingComment, setSavingComment] = useState(false)

  const fetchReviews = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(status === 'pending' ? { isApproved: 'false' } : {}),
        ...(status === 'approved' ? { isApproved: 'true' } : {}),
      })
      const data = await api.get<ReviewsResponse>(`/api/admin/reviews?${params}`, token)
      setReviews(data.data)
      setTotal(data.total)
      setTotalPages(Math.max(1, Math.ceil(data.total / data.pageSize)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הביקורות')
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize, status])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  useEffect(() => {
    setPage(1)
  }, [status, pageSize])

  async function handleSetApproved(review: ReviewDTO, isApproved: boolean) {
    if (!token || updatingId) return
    setUpdatingId(review.id)
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, isApproved } : r)))
    try {
      await api.patch(`/api/admin/reviews/${review.id}`, { isApproved }, token)
      fetchReviews()
    } catch (e) {
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, isApproved: review.isApproved } : r))
      )
      alert(e instanceof Error ? e.message : 'שגיאה בעדכון הביקורת')
    } finally {
      setUpdatingId(null)
    }
  }

  function startEditComment(review: ReviewDTO) {
    setEditingReview(review)
    setEditDraft({ comment_he: review.comment_he ?? '', comment_en: review.comment_en ?? '' })
  }

  async function saveComment() {
    if (!token || !editingReview) return
    setSavingComment(true)
    try {
      await api.patch(
        `/api/admin/reviews/${editingReview.id}`,
        {
          comment_he: editDraft.comment_he || undefined,
          comment_en: editDraft.comment_en || undefined,
        },
        token
      )
      setReviews((prev) =>
        prev.map((r) =>
          r.id === editingReview.id
            ? {
                ...r,
                comment_he: editDraft.comment_he || undefined,
                comment_en: editDraft.comment_en || undefined,
              }
            : r
        )
      )
      setEditingReview(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה בשמירת התגובה')
    } finally {
      setSavingComment(false)
    }
  }

  async function handleDelete(id: string) {
    if (!token) return
    setDeleting(true)
    try {
      await api.delete(`/api/admin/reviews/${id}`, token)
      setDeleteId(null)
      fetchReviews()
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
        <h2 className="text-xl font-bold text-text-main">ביקורות</h2>
        <p className="text-sm text-text-muted mt-0.5">{total} ביקורות סה&quot;כ</p>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-4 flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(v) => setStatus(v as 'all' | 'pending' | 'approved')}
          aria-label="סינון לפי סטטוס"
          options={[
            { value: 'pending', label: 'ממתינות לאישור' },
            { value: 'approved', label: 'מאושרות' },
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
          <table className="w-full text-sm" role="grid" aria-label="רשימת ביקורות">
            <thead>
              <tr className="border-b border-border bg-bg text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-start">מוצר</th>
                <th className="px-4 py-3 text-start">לקוח</th>
                <th className="px-4 py-3 text-start">דירוג</th>
                <th className="px-4 py-3 text-start">תגובה</th>
                <th className="px-4 py-3 text-start">תאריך</th>
                <th className="px-4 py-3 text-center">סטטוס</th>
                <th className="px-4 py-3 text-end w-32">פעולות</th>
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
                          style={{ width: j === 0 ? 100 : j === 3 ? 140 : 60 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <Star size={28} className="text-text-muted" aria-hidden="true" />
                      <span>
                        {status === 'pending' ? 'אין ביקורות ממתינות לאישור' : 'לא נמצאו ביקורות'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors align-top"
                  >
                    {/* מוצר */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-main truncate max-w-40">
                        {review.productName_he}
                      </p>
                      <p className="text-xs text-text-muted truncate max-w-40">
                        {review.productName_en}
                      </p>
                    </td>

                    {/* לקוח */}
                    <td className="px-4 py-3 text-text-main">{review.customerName}</td>

                    {/* דירוג */}
                    <td className="px-4 py-3">
                      <StarRating value={review.rating} readonly size="sm" />
                    </td>

                    {/* תגובה */}
                    <td className="px-4 py-3 text-text-muted max-w-64">
                      <p className="line-clamp-2">
                        {review.comment_he || review.comment_en || '—'}
                      </p>
                    </td>

                    {/* תאריך */}
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {formatDate(review.createdAt)}
                    </td>

                    {/* סטטוס */}
                    <td className="px-4 py-3 text-center">
                      {review.isApproved ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          מאושר
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          ממתין
                        </span>
                      )}
                    </td>

                    {/* פעולות */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {review.isApproved ? (
                          <button
                            onClick={() => handleSetApproved(review, false)}
                            disabled={updatingId === review.id}
                            title="הסרת פרסום"
                            aria-label="הסרת פרסום"
                            className="p-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            <X size={15} aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetApproved(review, true)}
                            disabled={updatingId === review.id}
                            title="אישור"
                            aria-label="אישור"
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            <Check size={15} aria-hidden="true" />
                          </button>
                        )}

                        <button
                          onClick={() => startEditComment(review)}
                          title="עריכת תגובה"
                          aria-label="עריכת תגובה"
                          className="p-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>

                        <button
                          onClick={() => setDeleteId(review.id)}
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
          aria-labelledby="delete-review-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3
              id="delete-review-dialog-title"
              className="text-base font-semibold text-text-main mb-2"
            >
              מחיקת ביקורת
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
                {deleting ? 'מוחק...' : 'מחק ביקורת'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit comment dialog */}
      {editingReview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-comment-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingReview(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-lg w-full">
            <h3
              id="edit-comment-dialog-title"
              className="text-base font-semibold text-text-main mb-4"
            >
              עריכת תגובת ביקורת — {editingReview.customerName}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  תגובה (עברית)
                </label>
                <textarea
                  rows={3}
                  value={editDraft.comment_he}
                  onChange={(e) => setEditDraft((d) => ({ ...d, comment_he: e.target.value }))}
                  dir="rtl"
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                />
              </div>
              <div dir="ltr">
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Comment (English)
                </label>
                <textarea
                  rows={3}
                  value={editDraft.comment_en}
                  onChange={(e) => setEditDraft((d) => ({ ...d, comment_en: e.target.value }))}
                  dir="ltr"
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setEditingReview(null)}
                disabled={savingComment}
                className="px-4 py-2 text-sm rounded-lg border border-border text-text-muted hover:bg-bg transition-colors cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={saveComment}
                disabled={savingComment}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {savingComment ? 'שומר...' : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
