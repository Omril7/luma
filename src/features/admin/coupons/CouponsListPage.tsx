'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  ChevronRight,
  ChevronLeft,
  Infinity,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import type { CouponDTO } from '@/shared/types'
import { Select } from '@/components/ui/Select'

interface CouponsResponse {
  data: CouponDTO[]
  total: number
  page: number
  pageSize: number
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'ללא הגבלה'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'ללא הגבלה'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function CouponsListPage() {
  const { token } = useAdminStore()
  const router = useRouter()

  const [coupons, setCoupons] = useState<CouponDTO[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchCoupons = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search ? { search } : {}),
        ...(isActive !== 'all' ? { isActive } : {}),
      })
      const data = await api.get<CouponsResponse>(`/api/admin/coupons?${params}`, token)
      setCoupons(data.data)
      setTotal(data.total)
      setTotalPages(Math.max(1, Math.ceil(data.total / data.pageSize)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הקופונים')
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize, search, isActive])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, isActive, pageSize])

  async function handleToggle(coupon: CouponDTO) {
    if (!token || togglingId) return
    setTogglingId(coupon.id)
    // Optimistic update
    setCoupons((prev) =>
      prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
    )
    try {
      const result = await api.patch<{ isActive: boolean }>(
        `/api/admin/coupons/${coupon.id}/toggle`,
        {},
        token
      )
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: result.isActive } : c))
      )
    } catch (e) {
      // Revert optimistic update on error
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: coupon.isActive } : c))
      )
      alert(e instanceof Error ? e.message : 'שגיאה בשינוי הסטטוס')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!token) return
    setDeleting(true)
    try {
      await api.delete(`/api/admin/coupons/${id}`, token)
      setDeleteId(null)
      fetchCoupons()
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-main">קופונים</h2>
          <p className="text-sm text-text-muted mt-0.5">{total} קופונים סה&quot;כ</p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden="true" />
          <span>קופון חדש</span>
        </Link>
      </div>

      {/* Filters */}
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
            placeholder="חיפוש לפי קוד קופון..."
            className="w-full h-10 ps-9 pe-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

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
          <table className="w-full text-sm" role="grid" aria-label="רשימת קופונים">
            <thead>
              <tr className="border-b border-border bg-bg text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-start">קוד</th>
                <th className="px-4 py-3 text-start">סוג הנחה</th>
                <th className="px-4 py-3 text-start">ערך</th>
                <th className="px-4 py-3 text-start">מינימום</th>
                <th className="px-4 py-3 text-start">שימושים</th>
                <th className="px-4 py-3 text-start">תוקף</th>
                <th className="px-4 py-3 text-center">סטטוס</th>
                <th className="px-4 py-3 text-end w-32">פעולות</th>
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
                          style={{ width: j === 0 ? 100 : j === 1 ? 80 : 60 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                    {search || isActive !== 'all'
                      ? 'לא נמצאו קופונים התואמים את הסינון'
                      : 'אין קופונים עדיין'}
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors"
                  >
                    {/* קוד */}
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-text-main uppercase tabular-nums tracking-wide">
                        {coupon.code}
                      </span>
                    </td>

                    {/* סוג הנחה */}
                    <td className="px-4 py-3">
                      {coupon.discountType === 'PERCENTAGE' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          אחוז
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          סכום קבוע
                        </span>
                      )}
                    </td>

                    {/* ערך */}
                    <td className="px-4 py-3 tabular-nums text-text-main font-medium">
                      {coupon.discountType === 'PERCENTAGE'
                        ? `${coupon.discountValue}%`
                        : `₪${coupon.discountValue.toLocaleString()}`}
                    </td>

                    {/* מינימום הזמנה */}
                    <td className="px-4 py-3 tabular-nums text-text-muted">
                      {coupon.minOrderAmount != null
                        ? `₪${coupon.minOrderAmount.toLocaleString()}`
                        : '—'}
                    </td>

                    {/* שימושים */}
                    <td className="px-4 py-3 tabular-nums text-text-muted">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        {coupon.maxUses != null ? (
                          coupon.maxUses
                        ) : (
                          <Infinity size={14} aria-label="ללא הגבלה" />
                        )}
                        <span>/</span>
                        {coupon.usedCount}
                      </span>
                    </td>

                    {/* תוקף */}
                    <td className="px-4 py-3 text-text-muted">{formatDate(coupon.validUntil)}</td>

                    {/* סטטוס */}
                    <td className="px-4 py-3 text-center">
                      {coupon.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          פעיל
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          לא פעיל
                        </span>
                      )}
                    </td>

                    {/* פעולות */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggle(coupon)}
                          disabled={togglingId === coupon.id}
                          title={coupon.isActive ? 'השבת קופון' : 'הפעל קופון'}
                          aria-label={coupon.isActive ? 'השבת קופון' : 'הפעל קופון'}
                          className={`p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-40 ${
                            coupon.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-text-muted hover:bg-secondary hover:text-text-main'
                          }`}
                        >
                          <Power size={15} aria-hidden="true" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => router.push(`/admin/coupons/${coupon.id}/edit`)}
                          title="עריכה"
                          className="p-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteId(coupon.id)}
                          title="מחיקה"
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
          aria-labelledby="delete-coupon-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3
              id="delete-coupon-dialog-title"
              className="text-base font-semibold text-text-main mb-2"
            >
              מחיקת קופון
            </h3>
            <p className="text-sm text-text-muted mb-6">הקופון יסומן כלא פעיל.</p>
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
                {deleting ? 'מוחק...' : 'מחק קופון'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
