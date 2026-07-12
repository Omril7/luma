'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowUp, ArrowDown, Trash2, Plus, Check, AlertCircle, Link2, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import { ImageUpload } from '@/components/ui/ImageUpload'

// ── Types ──────────────────────────────────────────────────────────────────────

interface InstagramHighlightDTO {
  id: string
  url: string
  linkUrl?: string
  sortOrder: number
  isActive: boolean
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const labelCls = 'block text-xs font-medium text-text-muted mb-1'

// ── Main component ─────────────────────────────────────────────────────────────

export function InstagramPage() {
  const { token } = useAdminStore()

  const [items, setItems] = useState<InstagramHighlightDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New item form state
  const [newUrl, setNewUrl] = useState<string | null>(null)
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<{ highlights: InstagramHighlightDTO[] }>(
        '/api/admin/instagram',
        token
      )
      setItems(data.highlights.sort((a, b) => a.sortOrder - b.sortOrder))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת התמונות')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // ── Reorder ───────────────────────────────────────────────────────────────

  async function handleMove(idx: number, dir: -1 | 1) {
    const next = idx + dir
    if (next < 0 || next >= items.length) return

    const idA = items[idx].id
    const idB = items[next].id
    const sortA = items[idx].sortOrder
    const sortB = items[next].sortOrder

    // Optimistic update
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === idA) return { ...item, sortOrder: sortB }
          if (item.id === idB) return { ...item, sortOrder: sortA }
          return item
        })
        .sort((a, b) => a.sortOrder - b.sortOrder)
    )

    try {
      await Promise.all([
        api.patch<{ highlight: InstagramHighlightDTO }>(
          `/api/admin/instagram/${idA}`,
          { sortOrder: sortB },
          token ?? ''
        ),
        api.patch<{ highlight: InstagramHighlightDTO }>(
          `/api/admin/instagram/${idB}`,
          { sortOrder: sortA },
          token ?? ''
        ),
      ])
    } catch {
      fetchItems() // revert on failure
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function handleToggleActive(item: InstagramHighlightDTO) {
    if (!token) return
    const nextActive = !item.isActive
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive: nextActive } : i)))
    try {
      await api.patch<{ highlight: InstagramHighlightDTO }>(
        `/api/admin/instagram/${item.id}`,
        { isActive: nextActive },
        token
      )
    } catch {
      fetchItems() // revert on failure
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!token) return
    setDeleting(true)
    try {
      await api.delete(`/api/admin/instagram/${id}`, token)
      setDeleteId(null)
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה במחיקה')
    } finally {
      setDeleting(false)
    }
  }

  // ── Add ───────────────────────────────────────────────────────────────────

  async function handleAdd() {
    if (!token || !newUrl) return
    setAdding(true)
    setAddError(null)
    try {
      const data = await api.post<{ highlight: InstagramHighlightDTO }>(
        '/api/admin/instagram',
        {
          url: newUrl,
          ...(newLinkUrl.trim() ? { linkUrl: newLinkUrl.trim() } : {}),
        },
        token
      )
      setItems((prev) => [...prev, data.highlight].sort((a, b) => a.sortOrder - b.sortOrder))
      setNewUrl(null)
      setNewLinkUrl('')
      setAddSuccess(true)
      setTimeout(() => setAddSuccess(false), 3000)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'שגיאה בהוספת התמונה')
    } finally {
      setAdding(false)
    }
  }

  const canAdd = !!newUrl

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loading) {
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

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
        <AlertCircle size={16} aria-hidden="true" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-text-main">אינסטגרם</h2>
        <p className="text-sm text-text-muted mt-0.5">
          {items.length} תמונות · מוצגות בסקשן &quot;עקבו אחרינו&quot; בעמוד הבית · גרור לשינוי סדר
          או השתמש בחצים
        </p>
      </div>

      {/* ── Existing items ───────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="py-12 text-center text-text-muted text-sm bg-surface border border-border rounded-lg">
          אין תמונות עדיין. הוסף תמונה ראשונה למטה.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`bg-surface border rounded-lg overflow-hidden group ${
                item.isActive ? 'border-border' : 'border-border opacity-50'
              }`}
            >
              {/* Image */}
              <div className="relative aspect-square bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />

                {!item.isActive && (
                  <div className="absolute top-2 start-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
                    <EyeOff size={11} aria-hidden="true" />
                    מוסתר
                  </div>
                )}

                {/* Reorder controls — overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    aria-label="הזז למעלה"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-text-main hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === items.length - 1}
                    aria-label="הזז למטה"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-text-main hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Meta + actions */}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {item.linkUrl ? (
                      <p
                        className="text-xs text-text-muted truncate flex items-center gap-1.5"
                        dir="ltr"
                      >
                        <Link2 size={12} className="shrink-0" aria-hidden="true" />
                        {item.linkUrl}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted italic">ללא קישור</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteId(item.id)}
                    aria-label="מחק תמונה"
                    className="flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] -me-1 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs text-text-main cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={() => handleToggleActive(item)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  מוצג באתר
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add new item ───────────────────────────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-text-muted" aria-hidden="true" />
          <h3 className="text-base font-semibold text-text-main">הוסף תמונה</h3>
        </div>

        <ImageUpload value={newUrl} onChange={setNewUrl} token={token ?? ''} label="תמונה" />

        <div>
          <label className={labelCls}>קישור לפוסט באינסטגרם (אופציונלי)</label>
          <input
            type="url"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            dir="ltr"
            placeholder="https://instagram.com/p/..."
            className={inputCls}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            {addSuccess && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check size={12} aria-hidden="true" /> התמונה נוספה בהצלחה
              </p>
            )}
            {addError && <p className="text-xs text-red-600">{addError}</p>}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd || adding}
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {adding ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                מוסיף...
              </>
            ) : (
              <>
                <Plus size={14} aria-hidden="true" />
                הוסף
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── Delete confirmation ───────────────────────────────────────────────── */}
      {deleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-instagram-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3
              id="delete-instagram-dialog-title"
              className="text-base font-semibold text-text-main mb-2"
            >
              מחיקת תמונה
            </h3>
            <p className="text-sm text-text-muted mb-5">
              האם למחוק את התמונה? פעולה זו אינה הפיכה.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg bg-bg border border-border text-text-main hover:bg-secondary transition-colors disabled:opacity-60 cursor-pointer min-h-[44px]"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer min-h-[44px]"
              >
                {deleting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={14} aria-hidden="true" />
                )}
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
