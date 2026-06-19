'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import { ImageUpload } from '@/components/ui/ImageUpload'

// ── Types ──────────────────────────────────────────────────────────────────────

interface HomeHero {
  title_he: string
  title_en: string
  subtitle_he: string
  subtitle_en: string
  cta_he: string
  cta_en: string
  imageUrl: string
}

interface HomeStory {
  title_he: string
  title_en: string
  body_he: string
  body_en: string
  imageUrl: string
}

interface AboutPage {
  title_he: string
  title_en: string
  body_he: string
  body_en: string
  imageUrl: string
}

interface ContactInfo {
  phone: string
  whatsapp: string
  email: string
  address_he: string
  address_en: string
  hours_he: string
  hours_en: string
}

interface FaqItem {
  q_he: string
  q_en: string
  a_he: string
  a_en: string
}

interface FaqItems {
  items: FaqItem[]
}

interface GalleryIntro {
  title_he: string
  title_en: string
  subtitle_he: string
  subtitle_en: string
}

type SiteContentMap = {
  'home.hero': HomeHero
  'home.story': HomeStory
  'about.page': AboutPage
  'contact.info': ContactInfo
  'faq.items': FaqItems
  'gallery.intro': GalleryIntro
}

type ContentKey = keyof SiteContentMap

// ── Defaults ───────────────────────────────────────────────────────────────────

function defaultHero(): HomeHero {
  return {
    title_he: '',
    title_en: '',
    subtitle_he: '',
    subtitle_en: '',
    cta_he: '',
    cta_en: '',
    imageUrl: '',
  }
}
function defaultStory(): HomeStory {
  return { title_he: '', title_en: '', body_he: '', body_en: '', imageUrl: '' }
}
function defaultAbout(): AboutPage {
  return { title_he: '', title_en: '', body_he: '', body_en: '', imageUrl: '' }
}
function defaultContact(): ContactInfo {
  return {
    phone: '',
    whatsapp: '',
    email: '',
    address_he: '',
    address_en: '',
    hours_he: '',
    hours_en: '',
  }
}
function defaultFaq(): FaqItems {
  return { items: [] }
}
function defaultGallery(): GalleryIntro {
  return { title_he: '', title_en: '', subtitle_he: '', subtitle_en: '' }
}

// ── Shared UI components ───────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const textareaCls =
  'w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none'

const labelCls = 'block text-xs font-medium text-text-muted mb-1'

const badgeHe = (
  <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-text-muted ms-1.5">
    עב
  </span>
)

const badgeEn = (
  <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-text-muted ms-1.5">
    EN
  </span>
)

interface SaveStatusProps {
  success: boolean
  error: string | null
}

function SaveStatus({ success, error }: SaveStatusProps) {
  if (success) return <p className="text-xs text-green-600 mt-1">נשמר בהצלחה ✓</p>
  if (error) return <p className="text-xs text-red-600 mt-1">{error}</p>
  return null
}

interface SaveButtonProps {
  saving: boolean
  onClick: () => void
}

function SaveButton({ saving, onClick }: SaveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {saving ? (
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
  )
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

function useSaveSection(key: ContentKey, token: string | null) {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(
    async (value: unknown) => {
      if (!token) return
      setSaving(true)
      setSuccess(false)
      setError(null)
      try {
        await api.put(`/api/admin/site-content/${key}`, { value }, token)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'שגיאה בשמירה')
      } finally {
        setSaving(false)
      }
    },
    [key, token]
  )

  return { saving, success, error, save }
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: { key: ContentKey; label: string }[] = [
  { key: 'home.hero', label: 'דף הבית — Hero' },
  { key: 'home.story', label: 'דף הבית — הסיפור שלנו' },
  { key: 'about.page', label: 'אודות' },
  { key: 'contact.info', label: 'יצירת קשר' },
  { key: 'faq.items', label: 'שאלות נפוצות' },
  { key: 'gallery.intro', label: 'גלריה' },
]

// ── Tab content panels ─────────────────────────────────────────────────────────

interface HeroTabProps {
  data: HomeHero
  onChange: (d: HomeHero) => void
  onSave: () => void
  saving: boolean
  success: boolean
  error: string | null
  token: string
}

function HeroTab({ data, onChange, onSave, saving, success, error, token }: HeroTabProps) {
  function set<K extends keyof HomeHero>(k: K, v: HomeHero[K]) {
    onChange({ ...data, [k]: v })
  }
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-text-main mb-4">דף הבית — Hero</h3>

      <div>
        <label className={labelCls}>כותרת ראשית {badgeHe}</label>
        <input
          type="text"
          value={data.title_he}
          onChange={(e) => set('title_he', e.target.value)}
          dir="rtl"
          placeholder="כותרת ראשית בעברית"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>כותרת ראשית {badgeEn}</label>
        <input
          type="text"
          value={data.title_en}
          onChange={(e) => set('title_en', e.target.value)}
          dir="ltr"
          placeholder="Main title in English"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>תת-כותרת {badgeHe}</label>
          <textarea
            rows={3}
            value={data.subtitle_he}
            onChange={(e) => set('subtitle_he', e.target.value)}
            dir="rtl"
            placeholder="תת-כותרת בעברית"
            className={`${textareaCls} min-h-[80px]`}
          />
        </div>
        <div>
          <label className={labelCls}>תת-כותרת {badgeEn}</label>
          <textarea
            rows={3}
            value={data.subtitle_en}
            onChange={(e) => set('subtitle_en', e.target.value)}
            dir="ltr"
            placeholder="Subtitle in English"
            className={`${textareaCls} min-h-[80px]`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>טקסט כפתור CTA {badgeHe}</label>
          <input
            type="text"
            value={data.cta_he}
            onChange={(e) => set('cta_he', e.target.value)}
            dir="rtl"
            placeholder="לחנות"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>טקסט כפתור CTA {badgeEn}</label>
          <input
            type="text"
            value={data.cta_en}
            onChange={(e) => set('cta_en', e.target.value)}
            dir="ltr"
            placeholder="Shop Now"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>תמונה ראשית</label>
        <ImageUpload
          value={data.imageUrl || null}
          onChange={(url) => set('imageUrl', url ?? '')}
          token={token}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <SaveStatus success={success} error={error} />
        <SaveButton saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

interface StoryTabProps {
  data: HomeStory
  onChange: (d: HomeStory) => void
  onSave: () => void
  saving: boolean
  success: boolean
  error: string | null
  token: string
}

function StoryTab({ data, onChange, onSave, saving, success, error, token }: StoryTabProps) {
  function set<K extends keyof HomeStory>(k: K, v: HomeStory[K]) {
    onChange({ ...data, [k]: v })
  }
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-text-main mb-4">דף הבית — הסיפור שלנו</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>כותרת {badgeHe}</label>
          <input
            type="text"
            value={data.title_he}
            onChange={(e) => set('title_he', e.target.value)}
            dir="rtl"
            placeholder="הסיפור שלנו"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>כותרת {badgeEn}</label>
          <input
            type="text"
            value={data.title_en}
            onChange={(e) => set('title_en', e.target.value)}
            dir="ltr"
            placeholder="Our Story"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>גוף טקסט {badgeHe}</label>
          <textarea
            rows={5}
            value={data.body_he}
            onChange={(e) => set('body_he', e.target.value)}
            dir="rtl"
            placeholder="תוכן הסיפור בעברית..."
            className={`${textareaCls} min-h-[120px]`}
          />
        </div>
        <div>
          <label className={labelCls}>גוף טקסט {badgeEn}</label>
          <textarea
            rows={5}
            value={data.body_en}
            onChange={(e) => set('body_en', e.target.value)}
            dir="ltr"
            placeholder="Story content in English..."
            className={`${textareaCls} min-h-[120px]`}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>תמונה</label>
        <ImageUpload
          value={data.imageUrl || null}
          onChange={(url) => set('imageUrl', url ?? '')}
          token={token}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <SaveStatus success={success} error={error} />
        <SaveButton saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

interface AboutTabProps {
  data: AboutPage
  onChange: (d: AboutPage) => void
  onSave: () => void
  saving: boolean
  success: boolean
  error: string | null
  token: string
}

function AboutTab({ data, onChange, onSave, saving, success, error, token }: AboutTabProps) {
  function set<K extends keyof AboutPage>(k: K, v: AboutPage[K]) {
    onChange({ ...data, [k]: v })
  }
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-text-main mb-4">אודות</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>כותרת {badgeHe}</label>
          <input
            type="text"
            value={data.title_he}
            onChange={(e) => set('title_he', e.target.value)}
            dir="rtl"
            placeholder="אודות לומה"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>כותרת {badgeEn}</label>
          <input
            type="text"
            value={data.title_en}
            onChange={(e) => set('title_en', e.target.value)}
            dir="ltr"
            placeholder="About Luma"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>גוף טקסט {badgeHe}</label>
          <textarea
            rows={8}
            value={data.body_he}
            onChange={(e) => set('body_he', e.target.value)}
            dir="rtl"
            placeholder="תוכן עמוד אודות בעברית..."
            className={`${textareaCls} min-h-[120px]`}
          />
        </div>
        <div>
          <label className={labelCls}>גוף טקסט {badgeEn}</label>
          <textarea
            rows={8}
            value={data.body_en}
            onChange={(e) => set('body_en', e.target.value)}
            dir="ltr"
            placeholder="About page content in English..."
            className={`${textareaCls} min-h-[120px]`}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>תמונה</label>
        <ImageUpload
          value={data.imageUrl || null}
          onChange={(url) => set('imageUrl', url ?? '')}
          token={token}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <SaveStatus success={success} error={error} />
        <SaveButton saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

interface ContactTabProps {
  data: ContactInfo
  onChange: (d: ContactInfo) => void
  onSave: () => void
  saving: boolean
  success: boolean
  error: string | null
}

function ContactTab({ data, onChange, onSave, saving, success, error }: ContactTabProps) {
  function set<K extends keyof ContactInfo>(k: K, v: ContactInfo[K]) {
    onChange({ ...data, [k]: v })
  }
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-text-main mb-4">יצירת קשר</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>טלפון</label>
          <input
            type="text"
            value={data.phone}
            onChange={(e) => set('phone', e.target.value)}
            dir="ltr"
            placeholder="050-1234567"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>וואטסאפ</label>
          <input
            type="text"
            value={data.whatsapp}
            onChange={(e) => set('whatsapp', e.target.value)}
            dir="ltr"
            placeholder="972501234567"
            className={inputCls}
          />
          <p className="text-xs text-text-muted mt-1">מספר בינלאומי, ללא + למשל 972501234567</p>
        </div>
        <div>
          <label className={labelCls}>אימייל</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => set('email', e.target.value)}
            dir="ltr"
            placeholder="hello@example.com"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>כתובת {badgeHe}</label>
          <input
            type="text"
            value={data.address_he}
            onChange={(e) => set('address_he', e.target.value)}
            dir="rtl"
            placeholder="רחוב הרצל 1, תל אביב"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>כתובת {badgeEn}</label>
          <input
            type="text"
            value={data.address_en}
            onChange={(e) => set('address_en', e.target.value)}
            dir="ltr"
            placeholder="1 Herzl St, Tel Aviv"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>שעות פעילות {badgeHe}</label>
          <input
            type="text"
            value={data.hours_he}
            onChange={(e) => set('hours_he', e.target.value)}
            dir="rtl"
            placeholder="א׳-ה׳ 09:00–18:00"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>שעות פעילות {badgeEn}</label>
          <input
            type="text"
            value={data.hours_en}
            onChange={(e) => set('hours_en', e.target.value)}
            dir="ltr"
            placeholder="Sun–Thu 09:00–18:00"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <SaveStatus success={success} error={error} />
        <SaveButton saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

interface FaqTabProps {
  data: FaqItems
  onChange: (d: FaqItems) => void
  onSave: () => void
  saving: boolean
  success: boolean
  error: string | null
}

function FaqTab({ data, onChange, onSave, saving, success, error }: FaqTabProps) {
  function setItems(items: FaqItem[]) {
    onChange({ items })
  }

  function addItem() {
    setItems([...data.items, { q_he: '', q_en: '', a_he: '', a_en: '' }])
  }

  function removeItem(idx: number) {
    setItems(data.items.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof FaqItem, value: string) {
    setItems(data.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    const next = [...data.items]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setItems(next)
  }

  function moveDown(idx: number) {
    if (idx === data.items.length - 1) return
    const next = [...data.items]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setItems(next)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-text-main mb-4">שאלות נפוצות</h3>

      {data.items.length === 0 && (
        <p className="text-sm text-text-muted py-4 text-center">
          אין שאלות עדיין. לחץ על &quot;הוסף שאלה&quot; להתחיל.
        </p>
      )}

      {data.items.map((item, idx) => (
        <div key={idx} className="border border-border rounded-lg p-4 space-y-3 bg-bg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-text-muted">שאלה {idx + 1}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                aria-label="הזז למעלה"
                className="p-1.5 rounded text-text-muted hover:bg-secondary hover:text-text-main disabled:opacity-30 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ArrowUp size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(idx)}
                disabled={idx === data.items.length - 1}
                aria-label="הזז למטה"
                className="p-1.5 rounded text-text-muted hover:bg-secondary hover:text-text-main disabled:opacity-30 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ArrowDown size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                aria-label="מחק שאלה"
                className="p-1.5 rounded text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>שאלה {badgeHe}</label>
              <input
                type="text"
                value={item.q_he}
                onChange={(e) => updateItem(idx, 'q_he', e.target.value)}
                dir="rtl"
                placeholder="השאלה בעברית"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>שאלה {badgeEn}</label>
              <input
                type="text"
                value={item.q_en}
                onChange={(e) => updateItem(idx, 'q_en', e.target.value)}
                dir="ltr"
                placeholder="Question in English"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>תשובה {badgeHe}</label>
              <textarea
                rows={3}
                value={item.a_he}
                onChange={(e) => updateItem(idx, 'a_he', e.target.value)}
                dir="rtl"
                placeholder="התשובה בעברית"
                className={`${textareaCls} min-h-[80px]`}
              />
            </div>
            <div>
              <label className={labelCls}>תשובה {badgeEn}</label>
              <textarea
                rows={3}
                value={item.a_en}
                onChange={(e) => updateItem(idx, 'a_en', e.target.value)}
                dir="ltr"
                placeholder="Answer in English"
                className={`${textareaCls} min-h-[80px]`}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors min-h-[44px] cursor-pointer"
      >
        <Plus size={16} aria-hidden="true" />
        הוסף שאלה
      </button>

      <div className="flex items-center justify-between pt-2">
        <SaveStatus success={success} error={error} />
        <SaveButton saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

interface GalleryTabProps {
  data: GalleryIntro
  onChange: (d: GalleryIntro) => void
  onSave: () => void
  saving: boolean
  success: boolean
  error: string | null
}

function GalleryTab({ data, onChange, onSave, saving, success, error }: GalleryTabProps) {
  function set<K extends keyof GalleryIntro>(k: K, v: GalleryIntro[K]) {
    onChange({ ...data, [k]: v })
  }
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-text-main mb-4">גלריה</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>כותרת {badgeHe}</label>
          <input
            type="text"
            value={data.title_he}
            onChange={(e) => set('title_he', e.target.value)}
            dir="rtl"
            placeholder="הגלריה שלנו"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>כותרת {badgeEn}</label>
          <input
            type="text"
            value={data.title_en}
            onChange={(e) => set('title_en', e.target.value)}
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
            value={data.subtitle_he}
            onChange={(e) => set('subtitle_he', e.target.value)}
            dir="rtl"
            placeholder="תת-כותרת הגלריה בעברית"
            className={`${textareaCls} min-h-[80px]`}
          />
        </div>
        <div>
          <label className={labelCls}>תת-כותרת {badgeEn}</label>
          <textarea
            rows={3}
            value={data.subtitle_en}
            onChange={(e) => set('subtitle_en', e.target.value)}
            dir="ltr"
            placeholder="Gallery subtitle in English"
            className={`${textareaCls} min-h-[80px]`}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <SaveStatus success={success} error={error} />
        <SaveButton saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SiteContentPage() {
  const { token } = useAdminStore()
  const [activeTab, setActiveTab] = useState<ContentKey>('home.hero')

  const [hero, setHero] = useState<HomeHero>(defaultHero())
  const [story, setStory] = useState<HomeStory>(defaultStory())
  const [about, setAbout] = useState<AboutPage>(defaultAbout())
  const [contact, setContact] = useState<ContactInfo>(defaultContact())
  const [faq, setFaq] = useState<FaqItems>(defaultFaq())
  const [gallery, setGallery] = useState<GalleryIntro>(defaultGallery())

  const [loadError, setLoadError] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)

  const heroSave = useSaveSection('home.hero', token)
  const storySave = useSaveSection('home.story', token)
  const aboutSave = useSaveSection('about.page', token)
  const contactSave = useSaveSection('contact.info', token)
  const faqSave = useSaveSection('faq.items', token)
  const gallerySave = useSaveSection('gallery.intro', token)

  const loadContent = useCallback(async () => {
    if (!token) return
    setPageLoading(true)
    setLoadError(null)
    try {
      const data = await api.get<Partial<SiteContentMap>>('/api/admin/site-content', token)
      if (data['home.hero']) setHero(data['home.hero'] as HomeHero)
      if (data['home.story']) setStory(data['home.story'] as HomeStory)
      if (data['about.page']) setAbout(data['about.page'] as AboutPage)
      if (data['contact.info']) setContact(data['contact.info'] as ContactInfo)
      if (data['faq.items']) setFaq(data['faq.items'] as FaqItems)
      if (data['gallery.intro']) setGallery(data['gallery.intro'] as GalleryIntro)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'שגיאה בטעינת תוכן האתר')
    } finally {
      setPageLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  if (pageLoading) {
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

  if (loadError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {loadError}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-main">תוכן האתר</h2>
        <p className="text-sm text-text-muted mt-0.5">עריכת תכנים המוצגים בחנות</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Tabs — horizontal on mobile, vertical on desktop */}
        <nav
          aria-label="ניווט קטעי תוכן"
          className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0 shrink-0 lg:w-52"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'true' : undefined}
              className={[
                'whitespace-nowrap text-sm font-medium px-4 py-2.5 rounded-lg text-start transition-colors cursor-pointer min-h-[44px] shrink-0',
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:bg-secondary hover:text-text-main',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-surface border border-border rounded-lg p-5">
            {activeTab === 'home.hero' && (
              <HeroTab
                data={hero}
                onChange={setHero}
                onSave={() => heroSave.save(hero)}
                saving={heroSave.saving}
                success={heroSave.success}
                error={heroSave.error}
                token={token ?? ''}
              />
            )}
            {activeTab === 'home.story' && (
              <StoryTab
                data={story}
                onChange={setStory}
                onSave={() => storySave.save(story)}
                saving={storySave.saving}
                success={storySave.success}
                error={storySave.error}
                token={token ?? ''}
              />
            )}
            {activeTab === 'about.page' && (
              <AboutTab
                data={about}
                onChange={setAbout}
                onSave={() => aboutSave.save(about)}
                saving={aboutSave.saving}
                success={aboutSave.success}
                error={aboutSave.error}
                token={token ?? ''}
              />
            )}
            {activeTab === 'contact.info' && (
              <ContactTab
                data={contact}
                onChange={setContact}
                onSave={() => contactSave.save(contact)}
                saving={contactSave.saving}
                success={contactSave.success}
                error={contactSave.error}
              />
            )}
            {activeTab === 'faq.items' && (
              <FaqTab
                data={faq}
                onChange={setFaq}
                onSave={() => faqSave.save(faq)}
                saving={faqSave.saving}
                success={faqSave.success}
                error={faqSave.error}
              />
            )}
            {activeTab === 'gallery.intro' && (
              <GalleryTab
                data={gallery}
                onChange={setGallery}
                onSave={() => gallerySave.save(gallery)}
                saving={gallerySave.saving}
                success={gallerySave.success}
                error={gallerySave.error}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
