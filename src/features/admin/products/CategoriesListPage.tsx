'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, Plus, Pencil, Power, Check, X as XIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import { IsraelFlag, USAFlag } from '@/components/ui/LangFlags'

// Local admin-only DTO — the storefront-facing CategoryDTO in `@/shared/types` intentionally
// omits sortOrder/isActive (public product responses don't need them), but the admin list/edit
// endpoints return the full Category row.
interface AdminCategoryDTO {
  id: string
  name_he: string
  name_en: string
  sortOrder: number
  isActive: boolean
}

interface EditDraft {
  name_he: string
  name_en: string
  sortOrder: string
}

const inputCls =
  'w-full h-9 px-2.5 text-xs bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const flagCls =
  'inline-block w-[16px] h-[11px] rounded-[2px] ms-1 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]'

export function CategoriesListPage() {
  const { token } = useAdminStore()

  const [categories, setCategories] = useState<AdminCategoryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>({
    name_he: '',
    name_en: '',
    sortOrder: '0',
  })
  const [saving, setSaving] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState<EditDraft>({
    name_he: '',
    name_en: '',
    sortOrder: '0',
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<{ categories: AdminCategoryDTO[] }>('/api/admin/categories', token)
      setCategories(data.categories)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הקטגוריות')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function startEdit(category: AdminCategoryDTO) {
    setEditingId(category.id)
    setEditDraft({
      name_he: category.name_he,
      name_en: category.name_en,
      sortOrder: String(category.sortOrder),
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    if (!token) return
    setSaving(true)
    try {
      const { category } = await api.patch<{ category: AdminCategoryDTO }>(
        `/api/admin/categories/${id}`,
        {
          name_he: editDraft.name_he.trim(),
          name_en: editDraft.name_en.trim(),
          sortOrder: Number(editDraft.sortOrder) || 0,
        },
        token
      )
      setCategories((prev) => prev.map((c) => (c.id === id ? category : c)))
      setEditingId(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה בשמירת הקטגוריה')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(category: AdminCategoryDTO) {
    if (!token || togglingId) return
    setTogglingId(category.id)
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, isActive: !c.isActive } : c))
    )
    try {
      const result = await api.patch<{ isActive: boolean }>(
        `/api/admin/categories/${category.id}/toggle`,
        {},
        token
      )
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isActive: result.isActive } : c))
      )
    } catch (e) {
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isActive: category.isActive } : c))
      )
      alert(e instanceof Error ? e.message : 'שגיאה בשינוי הסטטוס')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleCreate() {
    if (!token) return
    if (!createDraft.name_he.trim() || !createDraft.name_en.trim()) {
      setCreateError('יש למלא שם בעברית ובאנגלית')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const { category } = await api.post<{ category: AdminCategoryDTO }>(
        '/api/admin/categories',
        {
          name_he: createDraft.name_he.trim(),
          name_en: createDraft.name_en.trim(),
          sortOrder: Number(createDraft.sortOrder) || 0,
        },
        token
      )
      setCategories((prev) => [...prev, category])
      setCreateDraft({ name_he: '', name_en: '', sortOrder: '0' })
      setCreateOpen(false)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'שגיאה ביצירת הקטגוריה')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            aria-label="חזרה למוצרים"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-text-muted hover:bg-secondary transition-colors cursor-pointer"
          >
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-text-main">קטגוריות</h2>
            <p className="text-sm text-text-muted mt-0.5">{categories.length} קטגוריות סה&quot;כ</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen((o) => !o)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden="true" />
          <span>קטגוריה חדשה</span>
        </button>
      </div>

      {/* Create form */}
      {createOpen && (
        <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-main">קטגוריה חדשה</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                שם <IsraelFlag className={flagCls} />
              </label>
              <input
                type="text"
                value={createDraft.name_he}
                onChange={(e) => setCreateDraft((d) => ({ ...d, name_he: e.target.value }))}
                dir="rtl"
                className={inputCls}
              />
            </div>
            <div dir="ltr">
              <label className="block text-xs font-medium text-text-muted mb-1">
                Name <USAFlag className={flagCls} />
              </label>
              <input
                type="text"
                value={createDraft.name_en}
                onChange={(e) => setCreateDraft((d) => ({ ...d, name_en: e.target.value }))}
                dir="ltr"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">סדר מיון</label>
              <input
                type="number"
                min="0"
                value={createDraft.sortOrder}
                onChange={(e) => setCreateDraft((d) => ({ ...d, sortOrder: e.target.value }))}
                dir="ltr"
                className={inputCls}
              />
            </div>
          </div>
          {createError && <p className="text-xs text-red-600">{createError}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Plus size={14} aria-hidden="true" /> {creating ? 'יוצר...' : 'יצירה'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false)
                setCreateError(null)
              }}
              className="px-4 py-2 text-sm border border-border rounded-lg text-text-muted hover:bg-bg transition-colors cursor-pointer"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border-b border-border">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid" aria-label="רשימת קטגוריות">
            <thead>
              <tr className="border-b border-border bg-bg text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-start">שם (עברית)</th>
                <th className="px-4 py-3 text-start">Name (English)</th>
                <th className="px-4 py-3 text-start w-28">סדר מיון</th>
                <th className="px-4 py-3 text-center w-20">פעיל</th>
                <th className="px-4 py-3 text-end w-28">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-4 bg-secondary rounded animate-pulse"
                          style={{ width: j === 0 ? 100 : 60 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                    אין קטגוריות עדיין
                  </td>
                </tr>
              ) : (
                categories.map((category) => {
                  const isEditing = editingId === category.id
                  return (
                    <tr
                      key={category.id}
                      className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.name_he}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, name_he: e.target.value }))
                            }
                            dir="rtl"
                            className={inputCls}
                          />
                        ) : (
                          <span className="font-medium text-text-main">{category.name_he}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.name_en}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, name_en: e.target.value }))
                            }
                            dir="ltr"
                            className={inputCls}
                          />
                        ) : (
                          <span className="text-text-muted" dir="ltr">
                            {category.name_en}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editDraft.sortOrder}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, sortOrder: e.target.value }))
                            }
                            dir="ltr"
                            className={`${inputCls} w-20`}
                          />
                        ) : (
                          <span className="tabular-nums text-text-muted">{category.sortOrder}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleToggle(category)}
                          disabled={togglingId === category.id}
                          title={category.isActive ? 'השבת קטגוריה' : 'הפעל קטגוריה'}
                          aria-label={category.isActive ? 'השבת קטגוריה' : 'הפעל קטגוריה'}
                          className={`p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer disabled:opacity-40 ${
                            category.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-text-muted hover:bg-secondary hover:text-text-main'
                          }`}
                        >
                          <Power size={14} aria-hidden="true" />
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(category.id)}
                                disabled={saving}
                                title="שמירה"
                                aria-label="שמירה"
                                className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer disabled:opacity-40"
                              >
                                <Check size={14} aria-hidden="true" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                title="ביטול"
                                aria-label="ביטול"
                                className="p-2 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer disabled:opacity-40"
                              >
                                <XIcon size={14} aria-hidden="true" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(category)}
                              title="עריכה"
                              aria-label="עריכה"
                              className="p-2 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                            >
                              <Pencil size={14} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
