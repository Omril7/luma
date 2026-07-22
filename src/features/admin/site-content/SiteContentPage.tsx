'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminStore } from '@/stores/adminStore'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { IsraelFlag, USAFlag } from '@/components/ui/LangFlags'
import { StarRating } from '@/components/ui/StarRating'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AboutPage {
  title_he: string
  title_en: string
  body_he: string
  body_en: string
  imageUrl: string
}

interface HomeHero {
  eyebrow_he: string
  eyebrow_en: string
  heading_he: string
  heading_en: string
  subheading_he: string
  subheading_en: string
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

interface TestimonialItem {
  quote_he: string
  quote_en: string
  author_he: string
  author_en: string
  location_he: string
  location_en: string
  rating: number
}

interface TestimonialsData {
  items: TestimonialItem[]
}

type SiteContentMap = {
  'home.hero': HomeHero
  'home.testimonials': TestimonialsData
  'about.page': AboutPage
  'faq.items': FaqItems
}

type ContentKey = keyof SiteContentMap

// ── Defaults ───────────────────────────────────────────────────────────────────

function defaultAbout(): AboutPage {
  return { title_he: '', title_en: '', body_he: '', body_en: '', imageUrl: '' }
}
function defaultHomeHero(): HomeHero {
  return {
    eyebrow_he: '',
    eyebrow_en: '',
    heading_he: '',
    heading_en: '',
    subheading_he: '',
    subheading_en: '',
  }
}
function defaultFaq(): FaqItems {
  return { items: [] }
}
function defaultTestimonials(): TestimonialsData {
  return { items: [] }
}

// ── Shared UI components ───────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const textareaCls =
  'w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none'

const labelCls = 'block text-xs font-medium text-text-muted mb-1'

const flagCls =
  'inline-block w-[18px] h-[12px] rounded-[2px] ms-1.5 align-middle shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)]'
const badgeHe = <IsraelFlag className={flagCls} />
const badgeEn = <USAFlag className={flagCls} />

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
  { key: 'home.hero', label: 'דף הבית — הירו' },
  { key: 'home.testimonials', label: 'דף הבית — המלצות לקוחות' },
  { key: 'about.page', label: 'אודות' },
  { key: 'faq.items', label: 'שאלות נפוצות' },
]

// ── Tab content panels ─────────────────────────────────────────────────────────

interface HomeHeroTabProps {
  data: HomeHero
  onChange: (d: HomeHero) => void
  onSave: () => void
  saving: boolean
  success: boolean
  error: string | null
}

function HomeHeroTab({ data, onChange, onSave, saving, success, error }: HomeHeroTabProps) {
  function set<K extends keyof HomeHero>(k: K, v: HomeHero[K]) {
    onChange({ ...data, [k]: v })
  }
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-text-main mb-4">דף הבית — הירו</h3>
      <p className="text-xs text-text-muted -mt-2 mb-2">
        השאירו שדה ריק כדי להציג את ברירת המחדל הקיימת באתר.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>תגית עילית {badgeHe}</label>
          <input
            type="text"
            value={data.eyebrow_he}
            onChange={(e) => set('eyebrow_he', e.target.value)}
            dir="rtl"
            placeholder="עשוי ביד בישראל"
            className={inputCls}
          />
        </div>
        <div dir="ltr">
          <label className={labelCls}>Eyebrow {badgeEn}</label>
          <input
            type="text"
            value={data.eyebrow_en}
            onChange={(e) => set('eyebrow_en', e.target.value)}
            dir="ltr"
            placeholder="Handmade in Israel"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>כותרת ראשית {badgeHe}</label>
          <input
            type="text"
            value={data.heading_he}
            onChange={(e) => set('heading_he', e.target.value)}
            dir="rtl"
            placeholder="ריהוט בהזמנה אישית"
            className={inputCls}
          />
        </div>
        <div dir="ltr">
          <label className={labelCls}>Heading {badgeEn}</label>
          <input
            type="text"
            value={data.heading_en}
            onChange={(e) => set('heading_en', e.target.value)}
            dir="ltr"
            placeholder="Custom Furniture, Handmade"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>כותרת משנה {badgeHe}</label>
          <textarea
            rows={2}
            value={data.subheading_he}
            onChange={(e) => set('subheading_he', e.target.value)}
            dir="rtl"
            placeholder="כל פריט עשוי ביד, בהתאמה מושלמת לבית שלך"
            className={textareaCls}
          />
        </div>
        <div dir="ltr">
          <label className={labelCls}>Subheading {badgeEn}</label>
          <textarea
            rows={2}
            value={data.subheading_en}
            onChange={(e) => set('subheading_en', e.target.value)}
            dir="ltr"
            placeholder="Every piece crafted by hand, perfectly tailored for your home"
            className={textareaCls}
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
        <div dir="ltr">
          <label className={labelCls}>Title {badgeEn}</label>
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
        <div dir="ltr">
          <label className={labelCls}>Body text {badgeEn}</label>
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
            <div dir="ltr">
              <label className={labelCls}>Question {badgeEn}</label>
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
            <div dir="ltr">
              <label className={labelCls}>Answer {badgeEn}</label>
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

interface TestimonialsTabProps {
  data: TestimonialsData
  onChange: (d: TestimonialsData) => void
  onSave: () => void
  saving: boolean
  success: boolean
  error: string | null
}

function TestimonialsTab({ data, onChange, onSave, saving, success, error }: TestimonialsTabProps) {
  function setItems(items: TestimonialItem[]) {
    onChange({ items })
  }

  function addItem() {
    setItems([
      ...data.items,
      {
        quote_he: '',
        quote_en: '',
        author_he: '',
        author_en: '',
        location_he: '',
        location_en: '',
        rating: 5,
      },
    ])
  }

  function removeItem(idx: number) {
    setItems(data.items.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof TestimonialItem, value: string | number) {
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
      <h3 className="text-base font-semibold text-text-main mb-4">דף הבית — המלצות לקוחות</h3>

      {data.items.length === 0 && (
        <p className="text-sm text-text-muted py-4 text-center">
          אין המלצות עדיין. לחץ על &quot;הוסף המלצה&quot; להתחיל.
        </p>
      )}

      {data.items.map((item, idx) => (
        <div key={idx} className="border border-border rounded-lg p-4 space-y-3 bg-bg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-text-muted">המלצה {idx + 1}</span>
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
                aria-label="מחק המלצה"
                className="p-1.5 rounded text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>דירוג</label>
            <StarRating
              value={item.rating}
              onChange={(rating) => updateItem(idx, 'rating', rating)}
              size="sm"
              aria-label="דירוג"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>ציטוט {badgeHe}</label>
              <textarea
                rows={3}
                value={item.quote_he}
                onChange={(e) => updateItem(idx, 'quote_he', e.target.value)}
                dir="rtl"
                placeholder="הציטוט בעברית"
                className={`${textareaCls} min-h-[80px]`}
              />
            </div>
            <div dir="ltr">
              <label className={labelCls}>Quote {badgeEn}</label>
              <textarea
                rows={3}
                value={item.quote_en}
                onChange={(e) => updateItem(idx, 'quote_en', e.target.value)}
                dir="ltr"
                placeholder="Quote in English"
                className={`${textareaCls} min-h-[80px]`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>שם הלקוח {badgeHe}</label>
              <input
                type="text"
                value={item.author_he}
                onChange={(e) => updateItem(idx, 'author_he', e.target.value)}
                dir="rtl"
                placeholder="מיכל כהן"
                className={inputCls}
              />
            </div>
            <div dir="ltr">
              <label className={labelCls}>Customer name {badgeEn}</label>
              <input
                type="text"
                value={item.author_en}
                onChange={(e) => updateItem(idx, 'author_en', e.target.value)}
                dir="ltr"
                placeholder="Michal Cohen"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>עיר {badgeHe}</label>
              <input
                type="text"
                value={item.location_he}
                onChange={(e) => updateItem(idx, 'location_he', e.target.value)}
                dir="rtl"
                placeholder="תל אביב"
                className={inputCls}
              />
            </div>
            <div dir="ltr">
              <label className={labelCls}>City {badgeEn}</label>
              <input
                type="text"
                value={item.location_en}
                onChange={(e) => updateItem(idx, 'location_en', e.target.value)}
                dir="ltr"
                placeholder="Tel Aviv"
                className={inputCls}
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
        הוסף המלצה
      </button>

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

  const [homeHero, setHomeHero] = useState<HomeHero>(defaultHomeHero())
  const [testimonials, setTestimonials] = useState<TestimonialsData>(defaultTestimonials())
  const [about, setAbout] = useState<AboutPage>(defaultAbout())
  const [faq, setFaq] = useState<FaqItems>(defaultFaq())

  const [loadError, setLoadError] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)

  const homeHeroSave = useSaveSection('home.hero', token)
  const testimonialsSave = useSaveSection('home.testimonials', token)
  const aboutSave = useSaveSection('about.page', token)
  const faqSave = useSaveSection('faq.items', token)

  const loadContent = useCallback(async () => {
    if (!token) return
    setPageLoading(true)
    setLoadError(null)
    try {
      const { content } = await api.get<{ content: Partial<SiteContentMap> }>(
        '/api/admin/site-content',
        token
      )
      if (content['home.hero']) setHomeHero(content['home.hero'] as HomeHero)
      if (content['home.testimonials'])
        setTestimonials(content['home.testimonials'] as TestimonialsData)
      if (content['about.page']) setAbout(content['about.page'] as AboutPage)
      if (content['faq.items']) setFaq(content['faq.items'] as FaqItems)
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
              <HomeHeroTab
                data={homeHero}
                onChange={setHomeHero}
                onSave={() => homeHeroSave.save(homeHero)}
                saving={homeHeroSave.saving}
                success={homeHeroSave.success}
                error={homeHeroSave.error}
              />
            )}
            {activeTab === 'home.testimonials' && (
              <TestimonialsTab
                data={testimonials}
                onChange={setTestimonials}
                onSave={() => testimonialsSave.save(testimonials)}
                saving={testimonialsSave.saving}
                success={testimonialsSave.success}
                error={testimonialsSave.error}
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
          </div>
        </div>
      </div>
    </div>
  )
}
