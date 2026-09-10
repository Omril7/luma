'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Check,
  X,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Star,
  Pencil,
  Eye,
  Plus,
  Home,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import type { ReviewDTO } from '@/shared/types'
import { Select } from '@/components/ui/Select'
import { StarRating } from '@/components/ui/StarRating'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface ReviewsResponse {
  data: ReviewDTO[]
  total: number
  page: number
  pageSize: number
}

interface ProductOption {
  id: string
  name_he: string
  name_en: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const GLOBAL_CHIP = (
  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-text-muted">
    <Home size={11} aria-hidden="true" />
    ביקורת כללית
  </span>
)

function StatusBadge({ status }: { status: ReviewDTO['status'] }) {
  if (status === 'APPROVED')
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        מאושר
      </span>
    )
  if (status === 'REJECTED')
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        נדחה
      </span>
    )
  if (status === 'READ')
    return (
      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-text-muted">
        נצפה
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
      ממתין
    </span>
  )
}

const EMPTY_CREATE = {
  target: 'global' as 'global' | 'product',
  productId: '',
  customerName: '',
  rating: 5,
  comment_he: '',
  comment_en: '',
  imageUrl: null as string | null,
  featuredOnHome: false,
}

export function ReviewsListPage() {
  const { token } = useAdminStore()

  const [reviews, setReviews] = useState<ReviewDTO[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<'all' | 'NEW' | 'READ' | 'APPROVED' | 'REJECTED'>('NEW')
  const [scope, setScope] = useState<'all' | 'global' | 'product'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [editingReview, setEditingReview] = useState<ReviewDTO | null>(null)
  const [editDraft, setEditDraft] = useState({
    comment_he: '',
    comment_en: '',
    rating: 5,
    imageUrl: null as string | null,
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [viewReview, setViewReview] = useState<ReviewDTO | null>(null)

  const [products, setProducts] = useState<ProductOption[]>([])
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState(EMPTY_CREATE)
  const [savingCreate, setSavingCreate] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(status !== 'all' ? { status } : {}),
        ...(scope !== 'all' ? { scope } : {}),
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
  }, [token, page, pageSize, status, scope])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  useEffect(() => {
    setPage(1)
  }, [status, scope, pageSize])

  // Products for the "new review" target picker (best-effort; up to 50).
  useEffect(() => {
    if (!token) return
    api
      .get<{ products: ProductOption[] }>('/api/admin/products?limit=50&isActive=true', token)
      .then((d) => setProducts(d.products))
      .catch(() => setProducts([]))
  }, [token])

  function patchLocal(id: string, patch: Partial<ReviewDTO>) {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function handleSetStatus(
    review: ReviewDTO,
    newStatus: 'NEW' | 'READ' | 'APPROVED' | 'REJECTED'
  ) {
    if (!token || updatingId) return
    setUpdatingId(review.id)
    const featuredAfter = newStatus === 'APPROVED' ? review.featuredOnHome : false
    patchLocal(review.id, { status: newStatus, featuredOnHome: featuredAfter })
    try {
      await api.patch(`/api/admin/reviews/${review.id}`, { status: newStatus }, token)
      fetchReviews()
    } catch (e) {
      patchLocal(review.id, { status: review.status, featuredOnHome: review.featuredOnHome })
      alert(e instanceof Error ? e.message : 'שגיאה בעדכון הביקורת')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleToggleFeatured(review: ReviewDTO) {
    if (!token || updatingId || review.status !== 'APPROVED') return
    setUpdatingId(review.id)
    const next = !review.featuredOnHome
    patchLocal(review.id, { featuredOnHome: next })
    try {
      await api.patch(`/api/admin/reviews/${review.id}`, { featuredOnHome: next }, token)
    } catch (e) {
      patchLocal(review.id, { featuredOnHome: review.featuredOnHome })
      alert(e instanceof Error ? e.message : 'שגיאה בעדכון')
    } finally {
      setUpdatingId(null)
    }
  }

  function startEdit(review: ReviewDTO) {
    setEditingReview(review)
    setEditDraft({
      comment_he: review.comment_he ?? '',
      comment_en: review.comment_en ?? '',
      rating: review.rating,
      imageUrl: review.imageUrl ?? null,
    })
  }

  async function saveEdit() {
    if (!token || !editingReview) return
    setSavingEdit(true)
    try {
      const { review } = await api.patch<{ review: ReviewDTO }>(
        `/api/admin/reviews/${editingReview.id}`,
        {
          comment_he: editDraft.comment_he || null,
          comment_en: editDraft.comment_en || null,
          rating: editDraft.rating,
          imageUrl: editDraft.imageUrl,
        },
        token
      )
      patchLocal(editingReview.id, review)
      setEditingReview(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה בשמירה')
    } finally {
      setSavingEdit(false)
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

  async function saveCreate() {
    if (!token) return
    if (createDraft.customerName.trim().length < 2) {
      setCreateError('יש להזין שם לקוח')
      return
    }
    if (createDraft.target === 'product' && !createDraft.productId) {
      setCreateError('יש לבחור מוצר')
      return
    }
    if (!createDraft.comment_he.trim() && !createDraft.comment_en.trim() && !createDraft.imageUrl) {
      setCreateError('יש להזין תגובה או תמונה')
      return
    }
    setSavingCreate(true)
    setCreateError(null)
    try {
      await api.post(
        '/api/admin/reviews',
        {
          productId: createDraft.target === 'product' ? createDraft.productId : null,
          customerName: createDraft.customerName.trim(),
          rating: createDraft.rating,
          comment_he: createDraft.comment_he.trim() || undefined,
          comment_en: createDraft.comment_en.trim() || undefined,
          imageUrl: createDraft.imageUrl ?? undefined,
          featuredOnHome: createDraft.featuredOnHome,
          status: 'APPROVED',
        },
        token
      )
      setCreating(false)
      setCreateDraft(EMPTY_CREATE)
      fetchReviews()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'שגיאה ביצירת הביקורת')
    } finally {
      setSavingCreate(false)
    }
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-main">ביקורות</h2>
          <p className="text-sm text-text-muted mt-0.5">{total} ביקורות סה&quot;כ</p>
        </div>
        <button
          onClick={() => {
            setCreateDraft(EMPTY_CREATE)
            setCreateError(null)
            setCreating(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer min-h-[40px]"
        >
          <Plus size={15} aria-hidden="true" />
          ביקורת חדשה
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-4 flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(v) => setStatus(v as 'all' | 'NEW' | 'READ' | 'APPROVED' | 'REJECTED')}
          aria-label="סינון לפי סטטוס"
          options={[
            { value: 'NEW', label: 'חדשות' },
            { value: 'READ', label: 'נצפו' },
            { value: 'APPROVED', label: 'מאושרות' },
            { value: 'REJECTED', label: 'נדחו' },
            { value: 'all', label: 'כל הסטטוסים' },
          ]}
        />

        <Select
          value={scope}
          onChange={(v) => setScope(v as 'all' | 'global' | 'product')}
          aria-label="סינון לפי היקף"
          options={[
            { value: 'all', label: 'כל ההיקפים' },
            { value: 'global', label: 'כלליות' },
            { value: 'product', label: 'לפי מוצר' },
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
                <th className="px-4 py-3 text-end w-40">פעולות</th>
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
                      <span>{status === 'NEW' ? 'אין ביקורות חדשות' : 'לא נמצאו ביקורות'}</span>
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
                      {review.productId ? (
                        <>
                          <p className="font-medium text-text-main truncate max-w-40">
                            {review.productName_he}
                          </p>
                          <p className="text-xs text-text-muted truncate max-w-40">
                            {review.productName_en}
                          </p>
                        </>
                      ) : (
                        GLOBAL_CHIP
                      )}
                    </td>

                    {/* לקוח */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {review.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={review.imageUrl}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded object-cover border border-border"
                          />
                        )}
                        <span className="text-text-main">{review.customerName}</span>
                      </div>
                    </td>

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
                      <StatusBadge status={review.status} />
                    </td>

                    {/* פעולות */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleFeatured(review)}
                          disabled={review.status !== 'APPROVED' || updatingId === review.id}
                          title={
                            review.status !== 'APPROVED'
                              ? 'יש לאשר את הביקורת תחילה'
                              : review.featuredOnHome
                                ? 'הסרה מעמוד הבית'
                                : 'הצגה בעמוד הבית'
                          }
                          aria-label="הצגה בעמוד הבית"
                          aria-pressed={review.featuredOnHome}
                          className={`p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            review.featuredOnHome
                              ? 'text-accent hover:bg-secondary'
                              : 'text-text-muted hover:bg-secondary hover:text-text-main'
                          }`}
                        >
                          <Star
                            size={15}
                            aria-hidden="true"
                            className={review.featuredOnHome ? 'fill-accent' : ''}
                          />
                        </button>

                        <button
                          onClick={() => {
                            setViewReview(review)
                            if (review.status === 'NEW') handleSetStatus(review, 'READ')
                          }}
                          title="צפייה בביקורת"
                          aria-label="צפייה בביקורת"
                          className="p-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          <Eye size={15} aria-hidden="true" />
                        </button>

                        {review.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleSetStatus(review, 'APPROVED')}
                            disabled={updatingId === review.id}
                            title="אישור"
                            aria-label="אישור"
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            <Check size={15} aria-hidden="true" />
                          </button>
                        )}

                        {review.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleSetStatus(review, 'REJECTED')}
                            disabled={updatingId === review.id}
                            title={review.status === 'APPROVED' ? 'הסרת פרסום' : 'דחייה'}
                            aria-label={review.status === 'APPROVED' ? 'הסרת פרסום' : 'דחייה'}
                            className="p-2 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            <X size={15} aria-hidden="true" />
                          </button>
                        )}

                        <button
                          onClick={() => startEdit(review)}
                          title="עריכה"
                          aria-label="עריכה"
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

      {/* View review dialog */}
      {viewReview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-review-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewReview(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-border">
              <div>
                <h3
                  id="view-review-dialog-title"
                  className="text-base font-semibold text-text-main"
                >
                  {viewReview.customerName}
                </h3>
                <p className="text-xs text-text-muted mt-1">{formatDate(viewReview.createdAt)}</p>
              </div>
              <button
                onClick={() => setViewReview(null)}
                title="סגירה"
                aria-label="סגירה"
                className="p-2 -m-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors cursor-pointer"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <StarRating value={viewReview.rating} readonly size="sm" />
                <StatusBadge status={viewReview.status} />
                {viewReview.featuredOnHome && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                    <Star size={11} className="fill-accent" aria-hidden="true" />
                    בעמוד הבית
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                  מוצר
                </p>
                {viewReview.productId ? (
                  <>
                    <p className="text-sm text-text-main">{viewReview.productName_he}</p>
                    <p className="text-xs text-text-muted">{viewReview.productName_en}</p>
                  </>
                ) : (
                  GLOBAL_CHIP
                )}
              </div>

              {viewReview.imageUrl && (
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                    תמונה
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewReview.imageUrl}
                    alt=""
                    className="max-h-64 rounded-lg border border-border object-contain"
                  />
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                  תגובה (עברית)
                </p>
                <p className="text-sm text-text-main whitespace-pre-line" dir="rtl">
                  {viewReview.comment_he || '—'}
                </p>
              </div>

              <div dir="ltr">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                  Comment (English)
                </p>
                <p className="text-sm text-text-main whitespace-pre-line">
                  {viewReview.comment_en || '—'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 pt-4 border-t border-border">
              {viewReview.status === 'APPROVED' && (
                <button
                  onClick={() => {
                    handleToggleFeatured(viewReview)
                    setViewReview((v) => (v ? { ...v, featuredOnHome: !v.featuredOnHome } : v))
                  }}
                  className="px-4 py-2 text-sm rounded-lg border border-border text-text-muted hover:bg-bg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Star
                    size={14}
                    aria-hidden="true"
                    className={viewReview.featuredOnHome ? 'fill-accent text-accent' : ''}
                  />
                  {viewReview.featuredOnHome ? 'הסרה מעמוד הבית' : 'הצגה בעמוד הבית'}
                </button>
              )}
              <button
                onClick={() => {
                  const r = viewReview
                  setViewReview(null)
                  startEdit(r)
                }}
                className="px-4 py-2 text-sm rounded-lg border border-border text-text-muted hover:bg-bg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Pencil size={14} aria-hidden="true" />
                עריכה
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Edit dialog */}
      {editingReview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-review-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingReview(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3
              id="edit-review-dialog-title"
              className="text-base font-semibold text-text-main mb-4"
            >
              עריכת ביקורת — {editingReview.customerName}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">דירוג</label>
                <StarRating
                  value={editDraft.rating}
                  onChange={(rating) => setEditDraft((d) => ({ ...d, rating }))}
                  size="sm"
                  aria-label="דירוג"
                />
              </div>
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
              <ImageUpload
                value={editDraft.imageUrl}
                onChange={(url) => setEditDraft((d) => ({ ...d, imageUrl: url }))}
                token={token ?? ''}
                label="תמונת הביקורת"
              />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setEditingReview(null)}
                disabled={savingEdit}
                className="px-4 py-2 text-sm rounded-lg border border-border text-text-muted hover:bg-bg transition-colors cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {savingEdit ? 'שומר...' : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New review dialog */}
      {creating && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-review-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreating(false)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3
              id="create-review-dialog-title"
              className="text-base font-semibold text-text-main mb-4"
            >
              ביקורת חדשה
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">היקף</label>
                <Select
                  value={createDraft.target}
                  onChange={(v) =>
                    setCreateDraft((d) => ({ ...d, target: v as 'global' | 'product' }))
                  }
                  aria-label="היקף הביקורת"
                  options={[
                    { value: 'global', label: 'כללית (על העסק)' },
                    { value: 'product', label: 'על מוצר' },
                  ]}
                />
              </div>

              {createDraft.target === 'product' && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">מוצר</label>
                  <Select
                    value={createDraft.productId}
                    onChange={(v) => setCreateDraft((d) => ({ ...d, productId: v }))}
                    aria-label="בחירת מוצר"
                    options={[
                      { value: '', label: 'בחר/י מוצר…' },
                      ...products.map((p) => ({ value: p.id, label: p.name_he })),
                    ]}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">שם הלקוח</label>
                <input
                  type="text"
                  value={createDraft.customerName}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, customerName: e.target.value }))}
                  className="w-full h-10 px-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">דירוג</label>
                <StarRating
                  value={createDraft.rating}
                  onChange={(rating) => setCreateDraft((d) => ({ ...d, rating }))}
                  size="sm"
                  aria-label="דירוג"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  תגובה (עברית)
                </label>
                <textarea
                  rows={3}
                  value={createDraft.comment_he}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, comment_he: e.target.value }))}
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
                  value={createDraft.comment_en}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, comment_en: e.target.value }))}
                  dir="ltr"
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                />
              </div>

              <ImageUpload
                value={createDraft.imageUrl}
                onChange={(url) => setCreateDraft((d) => ({ ...d, imageUrl: url }))}
                token={token ?? ''}
                label="תמונה (לא חובה)"
              />

              <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
                <input
                  type="checkbox"
                  checked={createDraft.featuredOnHome}
                  onChange={(e) =>
                    setCreateDraft((d) => ({ ...d, featuredOnHome: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                הצגה בעמוד הבית
              </label>

              {createError && (
                <p role="alert" className="text-sm text-red-600">
                  {createError}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setCreating(false)}
                disabled={savingCreate}
                className="px-4 py-2 text-sm rounded-lg border border-border text-text-muted hover:bg-bg transition-colors cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={saveCreate}
                disabled={savingCreate}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {savingCreate ? 'שומר...' : 'יצירת ביקורת'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
