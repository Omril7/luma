'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Select } from '@/components/ui/Select'

// Dates are handled as local 'YYYY-MM-DD' strings (same format as <input type="date">),
// so there is no timezone shifting.

interface DatePickerProps {
  /** 'YYYY-MM-DD' or '' for no date */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Earliest / latest selectable date, 'YYYY-MM-DD' */
  minDate?: string
  maxDate?: string
  hasError?: boolean
  id?: string
  'aria-label'?: string
  className?: string
  /** Explicit text direction. Inherits from the document when omitted. */
  dir?: 'rtl' | 'ltr'
}

const MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
]
const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const WEEKDAYS_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) }
}

function todayIso(): string {
  const now = new Date()
  return toIso(now.getFullYear(), now.getMonth(), now.getDate())
}

function addDays(iso: string, delta: number): string {
  const p = parseIso(iso)!
  const date = new Date(p.y, p.m, p.d + delta)
  return toIso(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDisplay(iso: string): string {
  const p = parseIso(iso)
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : ''
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'בחר תאריך',
  minDate,
  maxDate,
  hasError = false,
  id,
  'aria-label': ariaLabel,
  className,
  dir,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [view, setView] = useState({ y: 0, m: 0 })
  const [focusDate, setFocusDate] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const dialogId = useId()
  const pendingFocus = useRef(false)

  const today = todayIso()
  const selected = parseIso(value)

  function openPicker() {
    const base = parseIso(value) ?? parseIso(today)!
    setView({ y: base.y, m: base.m })
    setFocusDate(value || today)
    pendingFocus.current = true
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setOpenUpward(window.innerHeight - rect.bottom < 380)
    }
    setOpen(true)
  }

  function close(returnFocus = true) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  // Move focus to the requested day once the grid for its month is rendered
  useEffect(() => {
    if (!open || !focusDate || !pendingFocus.current) return
    pendingFocus.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus()
  }, [open, focusDate, view])

  function isDisabled(iso: string): boolean {
    return (!!minDate && iso < minDate) || (!!maxDate && iso > maxDate)
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  function choose(iso: string) {
    if (isDisabled(iso)) return
    onChange(iso)
    close()
  }

  function goToDate(iso: string) {
    const p = parseIso(iso)!
    setView({ y: p.y, m: p.m })
    setFocusDate(iso)
    pendingFocus.current = true
  }

  function handleGridKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const current = (e.target as HTMLElement).getAttribute('data-date')
    if (!current) return
    // Arrow keys follow the visual direction, which flips in RTL
    const rtl = wrapperRef.current
      ? getComputedStyle(wrapperRef.current).direction === 'rtl'
      : false
    let next: string | null = null
    switch (e.key) {
      case 'ArrowRight':
        next = addDays(current, rtl ? -1 : 1)
        break
      case 'ArrowLeft':
        next = addDays(current, rtl ? 1 : -1)
        break
      case 'ArrowDown':
        next = addDays(current, 7)
        break
      case 'ArrowUp':
        next = addDays(current, -7)
        break
      case 'PageDown': {
        const p = parseIso(current)!
        next = toIso(...clampDay(p.y, p.m + 1, p.d))
        break
      }
      case 'PageUp': {
        const p = parseIso(current)!
        next = toIso(...clampDay(p.y, p.m - 1, p.d))
        break
      }
      default:
        return
    }
    e.preventDefault()
    goToDate(next)
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault()
      openPicker()
    }
  }

  // ── Calendar grid ───────────────────────────────────────────────────────────
  const firstWeekday = new Date(view.y, view.m, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells: Array<number | null> = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const tabDate =
    focusDate && focusDate.startsWith(`${view.y}-${pad(view.m + 1)}-`)
      ? focusDate
      : toIso(view.y, view.m, 1)

  // ── Month / year selects ────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear()
  const minYear = Math.min(
    minDate ? parseIso(minDate)!.y : currentYear - 5,
    view.y,
    selected?.y ?? view.y
  )
  const maxYear = Math.max(
    maxDate ? parseIso(maxDate)!.y : currentYear + 10,
    view.y,
    selected?.y ?? view.y
  )
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
    const y = minYear + i
    return { value: String(y), label: String(y) }
  })
  const monthOptions = MONTHS.map((label, i) => ({ value: String(i), label }))

  const popupY = openUpward ? 4 : -4
  const popupPosition = openUpward ? 'bottom-full mb-1' : 'top-full mt-1'

  const navBtn =
    'flex items-center justify-center w-8 h-8 rounded border border-border text-text-muted hover:bg-secondary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  return (
    <div ref={wrapperRef} dir={dir} className={`relative${className ? ` ${className}` : ''}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close(false) : openPicker())}
        onKeyDown={handleTriggerKeyDown}
        className={[
          'w-full h-10 ps-3 pe-9 text-sm bg-bg border rounded-lg text-start flex items-center relative cursor-pointer transition-colors',
          'focus:outline-none focus:ring-2',
          hasError
            ? 'border-red-400 focus:ring-red-400'
            : 'border-border focus:ring-primary focus:border-primary hover:border-primary/50',
        ].join(' ')}
      >
        <span className={value ? 'text-text-main' : 'text-text-muted'} dir="ltr">
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar
          size={15}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={dialogId}
            role="dialog"
            aria-label={ariaLabel ?? placeholder}
            initial={{ opacity: 0, y: popupY }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: popupY }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                close()
              }
            }}
            className={`absolute ${popupPosition} start-0 z-50 w-[19rem] max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-lg shadow-soft p-3`}
          >
            {/* Month / year navigation */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className={navBtn}
                aria-label="החודש הקודם"
              >
                <ChevronLeft size={16} className="rtl:rotate-180" aria-hidden="true" />
              </button>
              <Select
                className="flex-1 min-w-0"
                aria-label="חודש"
                value={String(view.m)}
                options={monthOptions}
                onChange={(v) => setView((s) => ({ ...s, m: Number(v) }))}
              />
              <Select
                className="w-[5.5rem] shrink-0"
                aria-label="שנה"
                value={String(view.y)}
                options={yearOptions}
                onChange={(v) => setView((s) => ({ ...s, y: Number(v) }))}
              />
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className={navBtn}
                aria-label="החודש הבא"
              >
                <ChevronRight size={16} className="rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 mb-1" aria-hidden="true">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="h-8 flex items-center justify-center text-xs text-text-muted"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Days */}
            <div
              ref={gridRef}
              role="grid"
              aria-label={`${MONTHS[view.m]} ${view.y}`}
              onKeyDown={handleGridKeyDown}
              className="grid grid-cols-7 gap-y-0.5"
            >
              {cells.map((day, i) => {
                if (day === null) return <div key={`blank-${i}`} role="gridcell" />
                const iso = toIso(view.y, view.m, day)
                const isSelected = iso === value
                const isToday = iso === today
                const disabled = isDisabled(iso)
                return (
                  <div
                    key={iso}
                    role="gridcell"
                    aria-selected={isSelected}
                    className="flex justify-center"
                  >
                    <button
                      type="button"
                      data-date={iso}
                      disabled={disabled}
                      // Roving tabindex: only the focus target is tabbable
                      tabIndex={iso === tabDate ? 0 : -1}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={`${WEEKDAYS_FULL[(firstWeekday + day - 1) % 7]}, ${day} ${MONTHS[view.m]} ${view.y}`}
                      onClick={() => choose(iso)}
                      className={[
                        'w-9 h-9 rounded-full text-sm transition-colors cursor-pointer',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        'disabled:opacity-35 disabled:cursor-not-allowed',
                        isSelected
                          ? 'bg-primary text-white font-medium'
                          : isToday
                            ? 'border border-primary text-text-main hover:bg-secondary'
                            : 'text-text-main hover:bg-secondary',
                      ].join(' ')}
                    >
                      {day}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  close()
                }}
                disabled={!value}
                className="text-xs text-text-muted hover:text-text-main px-2 py-1.5 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                נקה
              </button>
              <button
                type="button"
                onClick={() => choose(today)}
                disabled={isDisabled(today)}
                className="text-xs font-medium text-primary hover:bg-secondary px-2 py-1.5 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                היום
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Month arithmetic that keeps the day inside the target month (Jan 31 + 1 month → Feb 28/29)
function clampDay(y: number, m: number, d: number): [number, number, number] {
  const first = new Date(y, m, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return [first.getFullYear(), first.getMonth(), Math.min(d, last)]
}
