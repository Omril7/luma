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
  Link2,
  Eye,
  EyeOff,
  X as XIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { InstagramIcon } from '@/components/icons/InstagramIcon'
import { InstagramEmbedBlockquote } from '@/components/ui/InstagramEmbedBlockquote'

// ── Types ──────────────────────────────────────────────────────────────────────

interface InstagramHighlightDTO {
  id: string
  url?: string
  linkUrl?: string
  permalink?: string
  sortOrder: number
  isActive: boolean
}

const IMPORT_ERROR_MESSAGES: Record<string, string> = {
  ACCESS_TOKEN_REQUIRED:
    'אינסטגרם דורש כרגע אישור גישה (access token) שעדיין לא הוגדר במערכת. יש לפנות למפתח האתר להגדרת INSTAGRAM_OEMBED_ACCESS_TOKEN.',
  MEDIA_NOT_FOUND: 'הפוסט לא נמצא — ייתכן שהוא פרטי, נמחק, או שהכתובת שגויה.',
  INVALID_URL: 'הכתובת שהוזנה אינה קישור תקין לפוסט באינסטגרם.',
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
  const [reordering, setReordering] = useState(false)

  // Add-post modal
  const [addOpen, setAddOpen] = useState(false)

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
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הפוסטים')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // ── Reorder (drag-and-drop) ──────────────────────────────────────────────────

  // Live reorder while dragging — cheap local state update, not persisted yet.
  function handleReorder(next: InstagramHighlightDTO[]) {
    setItems(next)
  }

  // Persisted once the drag gesture ends: every row's sortOrder is set to its new index.
  async function persistOrder() {
    if (!token) return
    setReordering(true)
    const reindexed = items.map((item, i) => ({ ...item, sortOrder: i }))
    setItems(reindexed)
    try {
      await Promise.all(
        reindexed.map((item) =>
          api.patch<{ highlight: InstagramHighlightDTO }>(
            `/api/admin/instagram/${item.id}`,
            { sortOrder: item.sortOrder },
            token
          )
        )
      )
    } catch {
      fetchItems() // revert on failure
    } finally {
      setReordering(false)
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
          <h2 className="text-xl font-bold text-text-main">אינסטגרם</h2>
          <p className="text-sm text-text-muted mt-0.5">
            {items.length} פוסטים · מוצגים בסקשן &quot;עקבו אחרינו&quot; בעמוד הבית · גררו לפי הידית
            לשינוי סדר
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shrink-0"
        >
          <Plus size={16} aria-hidden="true" />
          הוסף פוסט
        </button>
      </div>

      {/* ── Existing posts — dense, drag-to-reorder rows ─────────────────────── */}
      {items.length === 0 ? (
        <div className="py-12 text-center text-text-muted text-sm bg-surface border border-border rounded-lg">
          אין פוסטים עדיין. הוסיפו פוסט ראשון למעלה.
        </div>
      ) : (
        <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-2">
          {items.map((item, idx) => (
            <PostRow
              key={item.id}
              item={item}
              idx={idx}
              token={token ?? ''}
              reordering={reordering}
              onDragEnd={persistOrder}
              onToggleActive={handleToggleActive}
              onRequestDelete={setDeleteId}
              onSaved={(updated) =>
                setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
              }
            />
          ))}
        </Reorder.Group>
      )}

      {/* ── Add-post modal ────────────────────────────────────────────────────── */}
      {addOpen && (
        <AddPostModal
          token={token ?? ''}
          onClose={() => setAddOpen(false)}
          onAdded={(highlight) => {
            setItems((prev) => [...prev, highlight].sort((a, b) => a.sortOrder - b.sortOrder))
            setAddOpen(false)
          }}
        />
      )}

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
              מחיקת פוסט
            </h3>
            <p className="text-sm text-text-muted mb-5">האם למחוק את הפוסט? פעולה זו אינה הפיכה.</p>
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

// ── Add-post modal ────────────────────────────────────────────────────────────
// Two ways to add, mirroring the page's previous inline layout: import-by-URL (primary) and
// manual upload (secondary), separated by a divider inside the same dialog.

function AddPostModal({
  token,
  onClose,
  onAdded,
}: {
  token: string
  onClose: () => void
  onAdded: (highlight: InstagramHighlightDTO) => void
}) {
  // Import-from-URL
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Manual upload
  const [newUrl, setNewUrl] = useState<string | null>(null)
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function handleImport() {
    if (!token || !importUrl.trim()) return
    setImporting(true)
    setImportError(null)
    try {
      const data = await api.post<{ highlight: InstagramHighlightDTO }>(
        '/api/admin/instagram/import',
        { postUrl: importUrl.trim() },
        token
      )
      onAdded(data.highlight)
    } catch (e) {
      const code = e instanceof Error ? e.message : ''
      setImportError(IMPORT_ERROR_MESSAGES[code] ?? 'שגיאה בייבוא הפוסט. נסו שוב.')
    } finally {
      setImporting(false)
    }
  }

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
      onAdded(data.highlight)
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
      aria-labelledby="add-instagram-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-surface border border-border rounded-xl shadow-xl p-6 max-w-lg w-full my-8 space-y-5">
        <div className="flex items-center justify-between">
          <h3 id="add-instagram-dialog-title" className="text-base font-semibold text-text-main">
            הוספת פוסט לאינסטגרם
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

        {/* Import from URL */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <InstagramIcon size={16} className="text-text-muted" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-text-main">ייבוא מאינסטגרם</h4>
          </div>
          <div>
            <label className={labelCls}>קישור לפוסט</label>
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              dir="ltr"
              placeholder="https://www.instagram.com/p/..."
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>{importError && <p className="text-xs text-red-600">{importError}</p>}</div>
            <button
              type="button"
              onClick={handleImport}
              disabled={!importUrl.trim() || importing}
              className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {importing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  מייבא...
                </>
              ) : (
                <>
                  <InstagramIcon size={14} aria-hidden="true" />
                  ייבוא
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-text-muted">או</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Manual upload */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-text-muted" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-text-main">העלאה ידנית</h4>
          </div>

          <ImageUpload value={newUrl} onChange={setNewUrl} token={token} label="תמונה" />

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
            <div>{addError && <p className="text-xs text-red-600">{addError}</p>}</div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newUrl || adding}
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
        </div>
      </div>
    </div>
  )
}

// ── Dense, expandable, draggable row ───────────────────────────────────────────

function PostRow({
  item,
  idx,
  token,
  reordering,
  onDragEnd,
  onToggleActive,
  onRequestDelete,
  onSaved,
}: {
  item: InstagramHighlightDTO
  idx: number
  token: string
  reordering: boolean
  onDragEnd: () => void
  onToggleActive: (item: InstagramHighlightDTO) => void
  onRequestDelete: (id: string) => void
  onSaved: (updated: InstagramHighlightDTO) => void
}) {
  const dragControls = useDragControls()
  const [expanded, setExpanded] = useState(false)
  const [linkUrlDraft, setLinkUrlDraft] = useState(item.linkUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const dirty = linkUrlDraft.trim() !== (item.linkUrl ?? '')
  const imported = !item.url

  async function handleSave() {
    if (!token || !dirty) return
    setSaving(true)
    setSaveError(null)
    try {
      const data = await api.patch<{ highlight: InstagramHighlightDTO }>(
        `/api/admin/instagram/${item.id}`,
        { linkUrl: linkUrlDraft.trim() || undefined },
        token
      )
      onSaved(data.highlight)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const cardTitle = imported ? 'פוסט מיובא' : `תמונה ${idx + 1}`
  const cardSubtitle = item.permalink || item.linkUrl

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className={`bg-surface border rounded-lg overflow-hidden ${
        item.isActive ? 'border-border' : 'border-border opacity-60'
      }`}
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

        {/* Thumbnail — image for manual uploads, Instagram-icon avatar for imported posts */}
        {item.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt=""
            className="w-12 h-12 shrink-0 rounded-md object-cover bg-bg"
            loading="lazy"
          />
        ) : (
          <div className="w-12 h-12 shrink-0 rounded-md bg-secondary/50 flex items-center justify-center">
            <InstagramIcon size={18} className="text-text-muted" aria-hidden="true" />
          </div>
        )}

        {/* Title / subtitle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex-1 min-w-0 text-start cursor-pointer"
        >
          <p className="text-sm font-medium text-text-main truncate">{cardTitle}</p>
          {cardSubtitle && (
            <p className="text-xs text-text-muted truncate" dir="ltr">
              {cardSubtitle}
            </p>
          )}
        </button>

        {saveSuccess && (
          <p className="text-xs text-green-600 flex items-center gap-1 shrink-0">
            <Check size={12} aria-hidden="true" /> נשמר
          </p>
        )}

        {/* Show/hide toggle */}
        <button
          type="button"
          onClick={() => onToggleActive(item)}
          aria-label={item.isActive ? 'הסתר באתר' : 'הצג באתר'}
          aria-pressed={item.isActive}
          className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-text-muted hover:bg-secondary transition-colors cursor-pointer"
        >
          {item.isActive ? (
            <Eye size={16} aria-hidden="true" />
          ) : (
            <EyeOff size={16} aria-hidden="true" />
          )}
        </button>

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
          onClick={() => onRequestDelete(item.id)}
          aria-label={`מחק פוסט — ${cardTitle}`}
          className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-border p-3 space-y-3 bg-bg/50">
          {item.permalink && (
            <>
              <a
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1.5 w-fit"
                dir="ltr"
              >
                <Link2 size={12} className="shrink-0" aria-hidden="true" />
                {item.permalink}
              </a>
              <div className="rounded-lg overflow-hidden bg-bg flex justify-center">
                <InstagramEmbedBlockquote permalink={item.permalink} maxWidth={360} />
              </div>
            </>
          )}
          <div>
            <label className={labelCls}>קישור מותאם אישית (אופציונלי)</label>
            <input
              type="url"
              value={linkUrlDraft}
              onChange={(e) => setLinkUrlDraft(e.target.value)}
              dir="ltr"
              placeholder="https://instagram.com/p/..."
              className={inputCls}
            />
            <p className="text-[11px] text-text-muted mt-1">
              {imported
                ? 'אם מוגדר, ישמש במקום קישור הפוסט המקורי בעת לחיצה בעמוד הבית.'
                : 'הקישור שאליו יועברו מבקרים בלחיצה על התמונה בעמוד הבית.'}
            </p>
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
