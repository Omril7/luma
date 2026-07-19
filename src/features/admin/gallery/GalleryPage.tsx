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
  title_he?: string
  title_en?: string
  subtitle_he?: string
  subtitle_en?: string
  altText_he: string
  altText_en: string
  sortOrder: number
}

// The editable text fields of a gallery image (everything except url/id/sortOrder)
type GalleryImageTexts = Pick<
  GalleryImageDTO,
  'title_he' | 'title_en' | 'subtitle_he' | 'subtitle_en' | 'altText_he' | 'altText_en'
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

  // Intro text (title/subtitle shown above the gallery on the public /gallery page)
  const [intro, setIntro] = useState<GalleryIntro>(defaultIntro())
  const [introSaving, setIntroSaving] = useState(false)
  const [introSuccess, setIntroSuccess] = useState(false)
  const [introError, setIntroError] = useState<string | null>(null)

  // New image form state
  const [newUrl, setNewUrl] = useState<string | null>(null)
  const [newTitleHe, setNewTitleHe] = useState('')
  const [newTitleEn, setNewTitleEn] = useState('')
  const [newSubtitleHe, setNewSubtitleHe] = useState('')
  const [newSubtitleEn, setNewSubtitleEn] = useState('')
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

  const canAdd =
    !!newUrl &&
    (newTitleHe.trim().length > 0 || newAltHe.trim().length > 0) &&
    (newTitleEn.trim().length > 0 || newAltEn.trim().length > 0)

  async function handleAdd() {
    if (!token || !canAdd || !newUrl) return
    setAdding(true)
    setAddError(null)
    try {
      const data = await api.post<{ image: GalleryImageDTO }>(
        '/api/admin/gallery',
        {
          url: newUrl,
          title_he: newTitleHe.trim(),
          title_en: newTitleEn.trim(),
          subtitle_he: newSubtitleHe.trim(),
          subtitle_en: newSubtitleEn.trim(),
          altText_he: newAltHe.trim(),
          altText_en: newAltEn.trim(),
        },
        token
      )
      setImages((prev) => [...prev, data.image].sort((a, b) => a.sortOrder - b.sortOrder))
      setNewUrl(null)
      setNewTitleHe('')
      setNewTitleEn('')
      setNewSubtitleHe('')
      setNewSubtitleEn('')
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

      {/* ── Existing images ──────────────────────────────────────────────────── */}
      {images.length === 0 ? (
        <div className="py-12 text-center text-text-muted text-sm bg-surface border border-border rounded-lg">
          אין תמונות בגלריה עדיין. הוסף תמונה ראשונה למטה.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img, idx) => (
            <ImageCard
              key={img.id}
              img={img}
              idx={idx}
              count={images.length}
              token={token ?? ''}
              onMove={handleMove}
              onRequestDelete={setDeleteId}
              onSaved={(updated) =>
                setImages((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
              }
            />
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
            <label className={labelCls}>כותרת {badgeHe}</label>
            <input
              type="text"
              value={newTitleHe}
              onChange={(e) => setNewTitleHe(e.target.value)}
              dir="rtl"
              placeholder="שולחן אלון בהזמנה אישית"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>Title {badgeEn}</label>
            <input
              type="text"
              value={newTitleEn}
              onChange={(e) => setNewTitleEn(e.target.value)}
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
              value={newSubtitleHe}
              onChange={(e) => setNewSubtitleHe(e.target.value)}
              dir="rtl"
              placeholder="אלון מלא, גימור שמן טבעי"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>Subtitle {badgeEn}</label>
            <input
              type="text"
              value={newSubtitleEn}
              onChange={(e) => setNewSubtitleEn(e.target.value)}
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
              value={newAltHe}
              onChange={(e) => setNewAltHe(e.target.value)}
              dir="rtl"
              placeholder="אם ריק — הכותרת תשמש"
              className={inputCls}
            />
          </div>
          <div dir="ltr">
            <label className={labelCls}>Alt text {badgeEn}</label>
            <input
              type="text"
              value={newAltEn}
              onChange={(e) => setNewAltEn(e.target.value)}
              dir="ltr"
              placeholder="Falls back to title"
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-[11px] text-text-muted -mt-2">
          הכותרת והתת-כותרת יוצגו על התמונה בגלריה. נדרשת כותרת או טקסט חלופי בכל שפה.
        </p>

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

// ── Editable image card ────────────────────────────────────────────────────────

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

function ImageCard({
  img,
  idx,
  count,
  token,
  onMove,
  onRequestDelete,
  onSaved,
}: {
  img: GalleryImageDTO
  idx: number
  count: number
  token: string
  onMove: (idx: number, dir: -1 | 1) => void
  onRequestDelete: (id: string) => void
  onSaved: (updated: GalleryImageDTO) => void
}) {
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

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden group">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt={img.altText_he || img.title_he || ''}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Reorder controls — overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onMove(idx, -1)}
            disabled={idx === 0}
            aria-label="הזז למעלה"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-text-main hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onMove(idx, 1)}
            disabled={idx === count - 1}
            aria-label="הזז למטה"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-text-main hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Editable texts */}
      <div className="p-3 space-y-3">
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

        {/* Footer: order, feedback, actions */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-[11px] text-text-muted shrink-0">סדר: {img.sortOrder + 1}</p>
            {saveSuccess && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check size={12} aria-hidden="true" /> נשמר
              </p>
            )}
            {saveError && <p className="text-xs text-red-600 truncate">{saveError}</p>}
          </div>
          <div className="flex items-center gap-1">
            {dirty && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[36px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={13} aria-hidden="true" />
                )}
                שמור
              </button>
            )}
            <button
              type="button"
              onClick={() => onRequestDelete(img.id)}
              aria-label={`מחק תמונה — ${cardTitle}`}
              className="flex items-center justify-center min-h-[36px] min-w-[36px] rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
