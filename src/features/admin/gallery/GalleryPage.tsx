'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowUp, ArrowDown, Trash2, Plus, Check, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { IsraelFlag, USAFlag } from '@/components/ui/LangFlags'

// ── Types ──────────────────────────────────────────────────────────────────────

interface GalleryImageDTO {
  id: string
  url: string
  altText_he: string
  altText_en: string
  sortOrder: number
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const labelCls = 'block text-xs font-medium text-text-muted mb-1'

// ── Main component ─────────────────────────────────────────────────────────────

export function GalleryPage() {
  const { token } = useAdminStore()

  const [images, setImages] = useState<GalleryImageDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New image form state
  const [newUrl, setNewUrl] = useState<string | null>(null)
  const [newAltHe, setNewAltHe] = useState('')
  const [newAltEn, setNewAltEn] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchImages = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<{ images: GalleryImageDTO[] }>('/api/admin/gallery', token)
      setImages(data.images.sort((a, b) => a.sortOrder - b.sortOrder))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הגלריה')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  // ── Reorder ───────────────────────────────────────────────────────────────

  async function handleMove(idx: number, dir: -1 | 1) {
    const next = idx + dir
    if (next < 0 || next >= images.length) return

    const idA = images[idx].id
    const idB = images[next].id
    const sortA = images[idx].sortOrder
    const sortB = images[next].sortOrder

    // Optimistic update
    setImages((prev) =>
      prev
        .map((img) => {
          if (img.id === idA) return { ...img, sortOrder: sortB }
          if (img.id === idB) return { ...img, sortOrder: sortA }
          return img
        })
        .sort((a, b) => a.sortOrder - b.sortOrder)
    )

    try {
      await Promise.all([
        api.patch<{ image: GalleryImageDTO }>(
          `/api/admin/gallery/${idA}`,
          { sortOrder: sortB },
          token ?? ''
        ),
        api.patch<{ image: GalleryImageDTO }>(
          `/api/admin/gallery/${idB}`,
          { sortOrder: sortA },
          token ?? ''
        ),
      ])
    } catch {
      fetchImages() // revert on failure
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!token) return
    setDeleting(true)
    try {
      await api.delete(`/api/admin/gallery/${id}`, token)
      setDeleteId(null)
      setImages((prev) => prev.filter((img) => img.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה במחיקה')
    } finally {
      setDeleting(false)
    }
  }

  // ── Add ───────────────────────────────────────────────────────────────────

  async function handleAdd() {
    if (!token || !newUrl || !newAltHe.trim() || !newAltEn.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      const data = await api.post<{ image: GalleryImageDTO }>(
        '/api/admin/gallery',
        {
          url: newUrl,
          altText_he: newAltHe.trim(),
          altText_en: newAltEn.trim(),
        },
        token
      )
      setImages((prev) => [...prev, data.image].sort((a, b) => a.sortOrder - b.sortOrder))
      setNewUrl(null)
      setNewAltHe('')
      setNewAltEn('')
      setAddSuccess(true)
      setTimeout(() => setAddSuccess(false), 3000)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'שגיאה בהוספת התמונה')
    } finally {
      setAdding(false)
    }
  }

  const canAdd = !!newUrl && newAltHe.trim().length > 0 && newAltEn.trim().length > 0

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
        <h2 className="text-xl font-bold text-text-main">גלריה</h2>
        <p className="text-sm text-text-muted mt-0.5">
          {images.length} תמונות · גרור לשינוי סדר או השתמש בחצים
        </p>
      </div>

      {/* ── Existing images ──────────────────────────────────────────────────── */}
      {images.length === 0 ? (
        <div className="py-12 text-center text-text-muted text-sm bg-surface border border-border rounded-lg">
          אין תמונות בגלריה עדיין. הוסף תמונה ראשונה למטה.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="bg-surface border border-border rounded-lg overflow-hidden group"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.altText_he}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

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
                    disabled={idx === images.length - 1}
                    aria-label="הזז למטה"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-text-main hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Meta + actions */}
              <div className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-xs text-text-main truncate flex items-center gap-1.5">
                      <IsraelFlag className="w-[14px] h-[9px] rounded-[2px] shrink-0 shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
                      {img.altText_he}
                    </p>
                    <p
                      className="text-xs text-text-muted truncate flex items-center gap-1.5"
                      dir="ltr"
                    >
                      <USAFlag className="w-[14px] h-[9px] rounded-[2px] shrink-0 shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
                      {img.altText_en}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteId(img.id)}
                    aria-label={`מחק תמונה — ${img.altText_he}`}
                    className="flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] -me-1 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
                <p className="text-[11px] text-text-muted">סדר: {img.sortOrder + 1}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add new image ─────────────────────────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-text-muted" aria-hidden="true" />
          <h3 className="text-base font-semibold text-text-main">הוסף תמונה לגלריה</h3>
        </div>

        <ImageUpload value={newUrl} onChange={setNewUrl} token={token ?? ''} label="תמונה" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              טקסט חלופי{' '}
              <IsraelFlag className="inline-block w-[14px] h-[9px] rounded-[2px] ms-1 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
              <span className="text-red-500 ms-0.5" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              value={newAltHe}
              onChange={(e) => setNewAltHe(e.target.value)}
              dir="rtl"
              placeholder="תיאור התמונה בעברית"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>
              Alt text{' '}
              <USAFlag className="inline-block w-[14px] h-[9px] rounded-[2px] ms-1 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]" />
              <span className="text-red-500 ms-0.5" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              value={newAltEn}
              onChange={(e) => setNewAltEn(e.target.value)}
              dir="ltr"
              placeholder="Image description in English"
              className={inputCls}
            />
          </div>
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
                הוסף לגלריה
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
          aria-labelledby="delete-gallery-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null)
          }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3
              id="delete-gallery-dialog-title"
              className="text-base font-semibold text-text-main mb-2"
            >
              מחיקת תמונה
            </h3>
            <p className="text-sm text-text-muted mb-5">
              האם למחוק את התמונה מהגלריה? פעולה זו אינה הפיכה.
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
