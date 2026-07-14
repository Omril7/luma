'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, Plus, Pencil, Power, Check, X as XIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import { IsraelFlag, USAFlag } from '@/components/ui/LangFlags'
import { ImageUpload } from '@/components/ui/ImageUpload'

// Local admin-only DTO — the storefront-facing ColorOptionDTO in `@/shared/types` intentionally
// omits isActive (public product responses don't need it), but the admin list/edit endpoints
// return the full ColorOption row.
interface AdminColorDTO {
  id: string
  name_he: string
  name_en: string
  hexCode: string
  imageUrl?: string | null
  isActive: boolean
}

interface EditDraft {
  name_he: string
  name_en: string
  hexCode: string
  imageUrl: string | null
}

const emptyDraft = (): EditDraft => ({
  name_he: '',
  name_en: '',
  hexCode: '#a8a29e',
  imageUrl: null,
})

const inputCls =
  'w-full h-9 px-2.5 text-xs bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const flagCls =
  'inline-block w-[16px] h-[11px] rounded-[2px] ms-1 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]'

function ColorSwatch({ color }: { color: AdminColorDTO }) {
  if (color.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={color.imageUrl}
        alt=""
        className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
      />
    )
  }
  return (
    <span
      className="w-8 h-8 rounded-full border border-border shrink-0 inline-block"
      style={{ backgroundColor: color.hexCode }}
      aria-hidden="true"
    />
  )
}

export function ColorsListPage() {
  const { token } = useAdminStore()

  const [colors, setColors] = useState<AdminColorDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>(emptyDraft())
  const [saving, setSaving] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState<EditDraft>(emptyDraft())
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchColors = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<{ colors: AdminColorDTO[] }>('/api/admin/colors', token)
      setColors(data.colors)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הצבעים')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchColors()
  }, [fetchColors])

  function startEdit(color: AdminColorDTO) {
    setEditingId(color.id)
    setEditDraft({
      name_he: color.name_he,
      name_en: color.name_en,
      hexCode: color.hexCode,
      imageUrl: color.imageUrl ?? null,
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    if (!token) return
    setSaving(true)
    try {
      const { color } = await api.patch<{ color: AdminColorDTO }>(
        `/api/admin/colors/${id}`,
        {
          name_he: editDraft.name_he.trim(),
          name_en: editDraft.name_en.trim(),
          hexCode: editDraft.hexCode,
          imageUrl: editDraft.imageUrl || undefined,
        },
        token
      )
      setColors((prev) => prev.map((c) => (c.id === id ? color : c)))
      setEditingId(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה בשמירת הצבע')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(color: AdminColorDTO) {
    if (!token || togglingId) return
    setTogglingId(color.id)
    setColors((prev) => prev.map((c) => (c.id === color.id ? { ...c, isActive: !c.isActive } : c)))
    try {
      const result = await api.patch<{ isActive: boolean }>(
        `/api/admin/colors/${color.id}/toggle`,
        {},
        token
      )
      setColors((prev) =>
        prev.map((c) => (c.id === color.id ? { ...c, isActive: result.isActive } : c))
      )
    } catch (e) {
      setColors((prev) =>
        prev.map((c) => (c.id === color.id ? { ...c, isActive: color.isActive } : c))
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
      const { color } = await api.post<{ color: AdminColorDTO }>(
        '/api/admin/colors',
        {
          name_he: createDraft.name_he.trim(),
          name_en: createDraft.name_en.trim(),
          hexCode: createDraft.hexCode,
          imageUrl: createDraft.imageUrl || undefined,
        },
        token
      )
      setColors((prev) => [...prev, color])
      setCreateDraft(emptyDraft())
      setCreateOpen(false)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'שגיאה ביצירת הצבע')
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
            <h2 className="text-xl font-bold text-text-main">צבעים</h2>
            <p className="text-sm text-text-muted mt-0.5">{colors.length} צבעים סה&quot;כ</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen((o) => !o)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden="true" />
          <span>צבע חדש</span>
        </button>
      </div>

      {/* Create form */}
      {createOpen && (
        <div className="bg-surface border border-border rounded-lg p-4 space-y-3 max-w-2xl">
          <h3 className="text-sm font-semibold text-text-main">צבע חדש</h3>
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
              <label className="block text-xs font-medium text-text-muted mb-1">גוון (Hex)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={createDraft.hexCode}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, hexCode: e.target.value }))}
                  className="w-9 h-9 rounded-lg border border-border cursor-pointer shrink-0"
                  aria-label="בחירת גוון"
                />
                <input
                  type="text"
                  value={createDraft.hexCode}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, hexCode: e.target.value }))}
                  dir="ltr"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
          <div className="max-w-xs">
            <label className="block text-xs font-medium text-text-muted mb-1">
              תמונת מרקם (אופציונלי)
            </label>
            <ImageUpload
              value={createDraft.imageUrl}
              onChange={(url) => setCreateDraft((d) => ({ ...d, imageUrl: url }))}
              token={token ?? ''}
            />
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
          <table className="w-full text-sm" role="grid" aria-label="רשימת צבעים">
            <thead>
              <tr className="border-b border-border bg-bg text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-start w-14">תצוגה</th>
                <th className="px-4 py-3 text-start">שם (עברית)</th>
                <th className="px-4 py-3 text-start">Name (English)</th>
                <th className="px-4 py-3 text-start">גוון</th>
                <th className="px-4 py-3 text-center w-20">פעיל</th>
                <th className="px-4 py-3 text-end w-28">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-4 bg-secondary rounded animate-pulse"
                          style={{ width: j === 0 ? 32 : j === 1 ? 100 : 60 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : colors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                    אין צבעים עדיין
                  </td>
                </tr>
              ) : (
                colors.map((color) => {
                  const isEditing = editingId === color.id
                  return (
                    <tr
                      key={color.id}
                      className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors align-top"
                    >
                      <td className="px-4 py-2.5">
                        <ColorSwatch color={isEditing ? { ...color, ...editDraft } : color} />
                      </td>
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
                          <span className="font-medium text-text-main">{color.name_he}</span>
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
                            {color.name_en}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {isEditing ? (
                          <div className="space-y-2 max-w-[180px]">
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={editDraft.hexCode}
                                onChange={(e) =>
                                  setEditDraft((d) => ({ ...d, hexCode: e.target.value }))
                                }
                                className="w-9 h-9 rounded-lg border border-border cursor-pointer shrink-0"
                                aria-label="בחירת גוון"
                              />
                              <input
                                type="text"
                                value={editDraft.hexCode}
                                onChange={(e) =>
                                  setEditDraft((d) => ({ ...d, hexCode: e.target.value }))
                                }
                                dir="ltr"
                                className={inputCls}
                              />
                            </div>
                            <ImageUpload
                              value={editDraft.imageUrl}
                              onChange={(url) => setEditDraft((d) => ({ ...d, imageUrl: url }))}
                              token={token ?? ''}
                              label="תמונת מרקם"
                            />
                          </div>
                        ) : (
                          <span className="text-text-muted tabular-nums" dir="ltr">
                            {color.hexCode}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleToggle(color)}
                          disabled={togglingId === color.id}
                          title={color.isActive ? 'השבת צבע' : 'הפעל צבע'}
                          aria-label={color.isActive ? 'השבת צבע' : 'הפעל צבע'}
                          className={`p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer disabled:opacity-40 ${
                            color.isActive
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
                                onClick={() => saveEdit(color.id)}
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
                              onClick={() => startEdit(color)}
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
