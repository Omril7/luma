'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  ChevronRight,
  ChevronLeft,
  Tag,
  Palette,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import type { ProductDTO, CategoryDTO } from '@/shared/types'
import { Select } from '@/components/ui/Select'

interface ProductsResponse {
  products: ProductDTO[]
  total: number
  page: number
  pages: number
}

export function ProductsListPage() {
  const { token } = useAdminStore()
  const router = useRouter()

  const [products, setProducts] = useState<ProductDTO[]>([])
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [isActive, setIsActive] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchProducts = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(category ? { category } : {}),
        ...(isActive !== 'all' ? { isActive } : {}),
      })
      const data = await api.get<ProductsResponse>(`/api/admin/products?${params}`, token)
      setProducts(data.products)
      setTotal(data.total)
      setPages(data.pages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת המוצרים')
    } finally {
      setLoading(false)
    }
  }, [token, page, limit, search, category, isActive])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    if (!token) return
    api
      .get<{ categories: CategoryDTO[] }>('/api/admin/categories', token)
      .then(({ categories }) => setCategories(categories))
      .catch(() => {})
  }, [token])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, category, isActive, limit])

  async function handleDelete(id: string) {
    if (!token) return
    setDeleting(true)
    try {
      await api.delete(`/api/admin/products/${id}`, token)
      setDeleteId(null)
      fetchProducts()
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      alert(
        msg.includes('existing orders')
          ? 'לא ניתן למחוק מוצר שקיימות עבורו הזמנות. ניתן לסמן אותו כלא פעיל במקום.'
          : msg || 'שגיאה במחיקה'
      )
    } finally {
      setDeleting(false)
    }
  }

  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-main">מוצרים</h2>
          <p className="text-sm text-text-muted mt-0.5">{total} מוצרים סה&quot;כ</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/products/categories"
            className="flex items-center gap-2 bg-surface border border-border text-text-main text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-secondary transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Tag size={16} aria-hidden="true" />
            <span>קטגוריות</span>
          </Link>
          <Link
            href="/admin/products/colors"
            className="flex items-center gap-2 bg-surface border border-border text-text-main text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-secondary transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Palette size={16} aria-hidden="true" />
            <span>צבעים</span>
          </Link>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" />
            <span>מוצר חדש</span>
          </Link>
        </div>
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
            placeholder="חיפוש לפי שם..."
            className="w-full h-10 ps-9 pe-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <Select
          value={category}
          onChange={setCategory}
          aria-label="סינון לפי קטגוריה"
          options={[
            { value: '', label: 'כל הקטגוריות' },
            ...categories.map((c) => ({ value: c.id, label: c.name_he })),
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
          value={String(limit)}
          onChange={(v) => setLimit(Number(v))}
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
          <table className="w-full text-sm" role="grid" aria-label="רשימת מוצרים">
            <thead>
              <tr className="border-b border-border bg-bg text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-start w-14">תמונה</th>
                <th className="px-4 py-3 text-start">שם</th>
                <th className="px-4 py-3 text-start">קטגוריה</th>
                <th className="px-4 py-3 text-start">מחיר בסיס</th>
                <th className="px-4 py-3 text-center">פעיל</th>
                <th className="px-4 py-3 text-center">מומלץ</th>
                <th className="px-4 py-3 text-center">גרסאות</th>
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
                          style={{ width: j === 0 ? 40 : j === 1 ? 140 : 80 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                    {search || category || isActive !== 'all'
                      ? 'לא נמצאו מוצרים התואמים את הסינון'
                      : 'אין מוצרים עדיין'}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {product.images[0] ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.images[0].altText_he}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-md object-cover border border-border"
                          unoptimized
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-secondary border border-border flex items-center justify-center text-text-muted text-xs">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-main truncate max-w-48">
                        {product.name_he}
                      </p>
                      <p className="text-xs text-text-muted truncate max-w-48">{product.name_en}</p>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{product.category.name_he}</td>
                    <td className="px-4 py-3 text-text-main tabular-nums">
                      ₪{product.basePrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${product.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                        aria-label={product.isActive ? 'פעיל' : 'לא פעיל'}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${product.isFeatured ? 'bg-primary' : 'bg-gray-300'}`}
                        aria-label={product.isFeatured ? 'מומלץ' : 'לא מומלץ'}
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-text-muted">
                      {product.variants.length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/he/product/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="תצוגה מקדימה"
                          className="p-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Eye size={15} aria-hidden="true" />
                        </a>
                        <button
                          onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                          title="עריכה"
                          className="p-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setDeleteId(product.id)}
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

              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = Math.max(1, Math.min(pages - 4, page - 2)) + i
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
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
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
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 id="delete-dialog-title" className="text-base font-semibold text-text-main mb-2">
              מחיקת מוצר
            </h3>
            <p className="text-sm text-text-muted mb-6">
              המוצר יימחק לצמיתות מהמסד — כולל הווריאציות, התמונות והביקורות שלו. לא ניתן לשחזר
              פעולה זו.
            </p>
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
                {deleting ? 'מוחק...' : 'מחק מוצר'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
