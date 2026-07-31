'use client'

import { useEffect, useState, useCallback } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import {
  GripVertical,
  ChevronDown,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  X as XIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { IsraelFlag, USAFlag } from '@/components/ui/LangFlags'

// ── Types ──────────────────────────────────────────────────────────────────────

interface GalleryImageDTO {
  id: string
  url: string
  title_he?: string
  title_en?: string
  subtitle_he?: string
  subtitle_en?: string
  altText_he: string
  altText_en: string
  sortOrder: number
}

// The editable text fields of a gallery image (everything except url/id/sortOrder). `Required`
// because `textsOf`/`emptyTexts` always coalesce to '' — draft state should never see undefined.
type GalleryImageTexts = Required<
  Pick<
    GalleryImageDTO,
    'title_he' | 'title_en' | 'subtitle_he' | 'subtitle_en' | 'altText_he' | 'altText_en'
  >
>

interface GalleryIntro {
  title_he: string
  title_en: string
  subtitle_he: string
  subtitle_en: string
}

function defaultIntro(): GalleryIntro {
  return { title_he: '', title_en: '', subtitle_he: '', subtitle_en: '' }
}

function emptyTexts(): GalleryImageTexts {
  return {
    title_he: '',
    title_en: '',
    subtitle_he: '',
    subtitle_en: '',
    altText_he: '',
    altText_en: '',
  }
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const textareaCls =
  'w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none'

const labelCls = 'block text-xs font-medium text-text-muted mb-1'

const flagCls =
  'inline-block w-[18px] h-[12px] rounded-[2px] ms-1.5 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]'
const badgeHe = <IsraelFlag className={flagCls} />
const badgeEn = <USAFlag className={flagCls} />

// ── Main component ─────────────────────────────────────────────────────────────

export function GalleryPage() {
  const { token } = useAdminStore()

  const [images, setImages] = useState<GalleryImageDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  // Intro text (title/subtitle shown above the gallery on the public /gallery page)
  const [intro, setIntro] = useState<GalleryIntro>(defaultIntro())
  const [introSaving, setIntroSaving] = useState(false)
  const [introSuccess, setIntroSuccess] = useState(false)
  const [introError, setIntroError] = useState<string | null>(null)

  // Add-image modal
  const [addOpen, setAddOpen] = useState(false)

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

  const fetchIntro = useCallback(async () => {
    if (!token) return
    try {
      const data = await api.get<{ item: { value: GalleryIntro } }>(
        '/api/admin/site-content/gallery.intro',
        token
      )
      setIntro(data.item.value)
    } catch {
      // No row yet (first time this section is used) — keep defaults, not an error.
    }
  }, [token])

  useEffect(() => {
    fetchImages()
    fetchIntro()
  }, [fetchImages, fetchIntro])

  async function handleSaveIntro() {
    if (!token) return
    setIntroSaving(true)
    setIntroSuccess(false)
    setIntroError(null)
    try {
      await api.put(`/api/admin/site-content/gallery.intro`, { value: intro }, token)
      setIntroSuccess(true)
      setTimeout(() => setIntroSuccess(false), 3000)
    } catch (e) {
      setIntroError(e instanceof Error ? e.message : 'שגיאה בשמירה')
    } finally {
      setIntroSaving(false)
    }
  }

  function setIntroField<K extends keyof GalleryIntro>(k: K, v: GalleryIntro[K]) {
    setIntro((prev) => ({ ...prev, [k]: v }))
  }

  // ── Reorder (drag-and-drop) ──────────────────────────────────────────────────

  // Live reorder while dragging — cheap local state update, not persisted yet.
  function handleReorder(next: GalleryImageDTO[]) {
    setImages(next)
  }

  // Persisted once the drag gesture ends: every row's sortOrder is set to its new index.
  // Gallery lists are small, so re-sending all of them (vs. diffing) keeps this simple.
  async function persistOrder() {
    if (!token) return
    setReordering(true)
    const reindexed = images.map((img, i) => ({ ...img, sortOrder: i }))
    setImages(reindexed)
    try {
      await Promise.all(
        reindexed.map((img) =>
          api.patch<{ image: GalleryImageDTO }>(
            `/api/admin/gallery/${img.id}`,
            { sortOrder: img.sortOrder },
            token
          )
        )
      )
    } catch {
      fetchImages() // revert on failure
    } finally {
      setReordering(false)
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-main">גלריה</h2>
          <p className="text-sm text-text-muted mt-0.5">
            {images.length} תמונות · גררו לפי הידית לשינוי סדר
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shrink-0"
        >
          <Plus size={16} aria-hidden="true" />
          הוסף תמונה
        </button>
      </div>

      {/* ── Intro text (shown above the gallery on the public /gallery page) ──── */}
      <section className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-base font-semibold text-text-main">כותרת העמוד</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>כותרת {badgeHe}</label>
            <input
              type="text"
              value={intro.title_he}
              onChange={(e) => setIntroField('title_he', e.target.value)}
              dir="rtl"
              placeholder="הגלריה שלנו"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>Title {badgeEn}</label>
            <input
              type="text"
              value={intro.title_en}
              onChange={(e) => setIntroField('title_en', e.target.value)}
              dir="ltr"
              placeholder="Our Gallery"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>תת-כותרת {badgeHe}</label>
            <textarea
              rows={3}
              value={intro.subtitle_he}
              onChange={(e) => setIntroField('subtitle_he', e.target.value)}
              dir="rtl"
              placeholder="תת-כותרת הגלריה בעברית"
              className={`${textareaCls} min-h-[80px]`}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>Subtitle {badgeEn}</label>
            <textarea
              rows={3}
              value={intro.subtitle_en}
              onChange={(e) => setIntroField('subtitle_en', e.target.value)}
              dir="ltr"
              placeholder="Gallery subtitle in English"
              className={`${textareaCls} min-h-[80px]`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            {introSuccess && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check size={12} aria-hidden="true" /> נשמר בהצלחה
              </p>
            )}
            {introError && <p className="text-xs text-red-600">{introError}</p>}
          </div>
          <button
            type="button"
            onClick={handleSaveIntro}
            disabled={introSaving}
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {introSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Check size={14} aria-hidden="true" />
                שמור
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── Existing images — dense, drag-to-reorder rows ───────────────────── */}
      {images.length === 0 ? (
        <div className="py-12 text-center text-text-muted text-sm bg-surface border border-border rounded-lg">
          אין תמונות בגלריה עדיין. הוסיפו תמונה ראשונה למעלה.
        </div>
      ) : (
        <Reorder.Group axis="y" values={images} onReorder={handleReorder} className="space-y-2">
          {images.map((img, idx) => (
            <ImageRow
              key={img.id}
              img={img}
              idx={idx}
              token={token ?? ''}
              reordering={reordering}
              onDragEnd={persistOrder}
              onRequestDelete={setDeleteId}
              onSaved={(updated) =>
                setImages((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
              }
            />
          ))}
        </Reorder.Group>
      )}

      {/* ── Add-image modal ──────────────────────────────────────────────────── */}
      {addOpen && (
        <AddImageModal
          token={token ?? ''}
          onClose={() => setAddOpen(false)}
          onAdded={(image) => {
            setImages((prev) => [...prev, image].sort((a, b) => a.sortOrder - b.sortOrder))
            setAddOpen(false)
          }}
        />
      )}

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

// ── Add-image modal ──────────────────────────────────────────────────────────

function AddImageModal({
  token,
  onClose,
  onAdded,
}: {
  token: string
  onClose: () => void
  onAdded: (image: GalleryImageDTO) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [draft, setDraft] = useState<GalleryImageTexts>(emptyTexts())
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  function setField<K extends keyof GalleryImageTexts>(k: K, v: string) {
    setDraft((prev) => ({ ...prev, [k]: v }))
  }

  const canAdd =
    !!url &&
    (draft.title_he.trim().length > 0 || draft.altText_he.trim().length > 0) &&
    (draft.title_en.trim().length > 0 || draft.altText_en.trim().length > 0)

  async function handleAdd() {
    if (!token || !canAdd || !url) return
    setAdding(true)
    setAddError(null)
    try {
      const data = await api.post<{ image: GalleryImageDTO }>(
        '/api/admin/gallery',
        {
          url,
          title_he: draft.title_he.trim(),
          title_en: draft.title_en.trim(),
          subtitle_he: draft.subtitle_he.trim(),
          subtitle_en: draft.subtitle_en.trim(),
          altText_he: draft.altText_he.trim(),
          altText_en: draft.altText_en.trim(),
        },
        token
      )
      onAdded(data.image)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'שגיאה בהוספת התמונה')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-gallery-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-lg w-full my-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 id="add-gallery-dialog-title" className="text-base font-semibold text-text-main">
            הוספת תמונה לגלריה
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:bg-secondary transition-colors cursor-pointer"
          >
            <XIcon size={16} aria-hidden="true" />
          </button>
        </div>

        <ImageUpload value={url} onChange={setUrl} token={token} label="תמונה" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>כותרת {badgeHe}</label>
            <input
              type="text"
              value={draft.title_he}
              onChange={(e) => setField('title_he', e.target.value)}
              dir="rtl"
              placeholder="שולחן אלון בהזמנה אישית"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>Title {badgeEn}</label>
            <input
              type="text"
              value={draft.title_en}
              onChange={(e) => setField('title_en', e.target.value)}
              dir="ltr"
              placeholder="Custom oak table"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>תת-כותרת {badgeHe}</label>
            <input
              type="text"
              value={draft.subtitle_he}
              onChange={(e) => setField('subtitle_he', e.target.value)}
              dir="rtl"
              placeholder="אלון מלא, גימור שמן טבעי"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>Subtitle {badgeEn}</label>
            <input
              type="text"
              value={draft.subtitle_en}
              onChange={(e) => setField('subtitle_en', e.target.value)}
              dir="ltr"
              placeholder="Solid oak, natural oil finish"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>טקסט חלופי (נגישות) {badgeHe}</label>
            <input
              type="text"
              value={draft.altText_he}
              onChange={(e) => setField('altText_he', e.target.value)}
              dir="rtl"
              placeholder="אם ריק — הכותרת תשמש"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>Alt text {badgeEn}</label>
            <input
              type="text"
              value={draft.altText_en}
              onChange={(e) => setField('altText_en', e.target.value)}
              dir="ltr"
              placeholder="Falls back to title"
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-[11px] text-text-muted">
          הכותרת והתת-כותרת יוצגו על התמונה בגלריה. נדרשת כותרת או טקסט חלופי בכל שפה.
        </p>

        <div className="flex items-center justify-between pt-1">
          <div>{addError && <p className="text-xs text-red-600">{addError}</p>}</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-bg border border-border text-text-main hover:bg-secondary transition-colors cursor-pointer min-h-[44px]"
            >
              ביטול
            </button>
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
        </div>
      </div>
    </div>
  )
}

// ── Dense, expandable, draggable row ───────────────────────────────────────────

function textsOf(img: GalleryImageDTO): GalleryImageTexts {
  return {
    title_he: img.title_he ?? '',
    title_en: img.title_en ?? '',
    subtitle_he: img.subtitle_he ?? '',
    subtitle_en: img.subtitle_en ?? '',
    altText_he: img.altText_he ?? '',
    altText_en: img.altText_en ?? '',
  }
}

function ImageRow({
  img,
  idx,
  token,
  reordering,
  onDragEnd,
  onRequestDelete,
  onSaved,
}: {
  img: GalleryImageDTO
  idx: number
  token: string
  reordering: boolean
  onDragEnd: () => void
  onRequestDelete: (id: string) => void
  onSaved: (updated: GalleryImageDTO) => void
}) {
  const dragControls = useDragControls()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState<GalleryImageTexts>(() => textsOf(img))
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(textsOf(img))

  function setField<K extends keyof GalleryImageTexts>(k: K, v: string) {
    setDraft((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!token || !dirty) return
    setSaving(true)
    setSaveError(null)
    try {
      const data = await api.patch<{ image: GalleryImageDTO }>(
        `/api/admin/gallery/${img.id}`,
        draft,
        token
      )
      onSaved(data.image)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const cardTitle = draft.title_he || draft.altText_he || `תמונה ${idx + 1}`
  const cardSubtitle = draft.subtitle_he || draft.subtitle_en

  return (
    <Reorder.Item
      value={img}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className="bg-surface border border-border rounded-lg overflow-hidden"
    >
      <div className="flex items-center gap-3 p-2.5">
        {/* Drag handle — only this triggers the drag gesture, not the whole row */}
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          aria-label="גרירה לשינוי סדר"
          disabled={reordering}
          className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-text-muted hover:bg-secondary transition-colors cursor-grab active:cursor-grabbing touch-none disabled:opacity-40"
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>

        {/* Thumbnail */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt={img.altText_he || img.title_he || ''}
          className="w-12 h-12 shrink-0 rounded-md object-cover bg-bg"
          loading="lazy"
        />

        {/* Title / subtitle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex-1 min-w-0 text-start cursor-pointer"
        >
          <p className="text-sm font-medium text-text-main truncate">{cardTitle}</p>
          {cardSubtitle && <p className="text-xs text-text-muted truncate">{cardSubtitle}</p>}
        </button>

        {saveSuccess && (
          <p className="text-xs text-green-600 flex items-center gap-1 shrink-0">
            <Check size={12} aria-hidden="true" /> נשמר
          </p>
        )}

        {/* Expand / delete */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'כווץ עריכה' : 'הרחב לעריכה'}
          aria-expanded={expanded}
          className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-text-muted hover:bg-secondary transition-colors cursor-pointer"
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(img.id)}
          aria-label={`מחק תמונה — ${cardTitle}`}
          className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-border p-3 space-y-3 bg-bg/50">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>כותרת {badgeHe}</label>
              <input
                type="text"
                value={draft.title_he}
                onChange={(e) => setField('title_he', e.target.value)}
                dir="rtl"
                className={inputCls}
              />
            </div>
            <div dir="ltr">
              <label className={labelCls}>Title {badgeEn}</label>
              <input
                type="text"
                value={draft.title_en}
                onChange={(e) => setField('title_en', e.target.value)}
                dir="ltr"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>תת-כותרת {badgeHe}</label>
              <input
                type="text"
                value={draft.subtitle_he}
                onChange={(e) => setField('subtitle_he', e.target.value)}
                dir="rtl"
                className={inputCls}
              />
            </div>
            <div dir="ltr">
              <label className={labelCls}>Subtitle {badgeEn}</label>
              <input
                type="text"
                value={draft.subtitle_en}
                onChange={(e) => setField('subtitle_en', e.target.value)}
                dir="ltr"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>טקסט חלופי (נגישות) {badgeHe}</label>
              <input
                type="text"
                value={draft.altText_he}
                onChange={(e) => setField('altText_he', e.target.value)}
                dir="rtl"
                placeholder="אם ריק — הכותרת תשמש"
                className={inputCls}
              />
            </div>
            <div dir="ltr">
              <label className={labelCls}>Alt text {badgeEn}</label>
              <input
                type="text"
                value={draft.altText_en}
                onChange={(e) => setField('altText_en', e.target.value)}
                dir="ltr"
                placeholder="Falls back to title"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="min-w-0">
              {saveError && <p className="text-xs text-red-600 truncate">{saveError}</p>}
            </div>
            {dirty && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[36px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={13} aria-hidden="true" />
                )}
                שמור
              </button>
            )}
          </div>
        </div>
      )}
    </Reorder.Item>
  )
}
