'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Pipette } from 'lucide-react'

// ── Color math ────────────────────────────────────────────────────────────────

interface Hsv {
  h: number // 0–360
  s: number // 0–1
  v: number // 0–1
}

const HEX_RE = /^#?([0-9a-fA-F]{6})$/

function normalizeHex(raw: string): string | null {
  const match = HEX_RE.exec(raw.trim())
  return match ? `#${match[1].toLowerCase()}` : null
}

function hexToHsv(hex: string): Hsv | null {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  const n = parseInt(normalized.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360

  return { h, s: max === 0 ? 0 : d / max, v: max }
}

function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const toHex = (ch: number) =>
    Math.round((ch + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

// ── EyeDropper API (progressive enhancement) ──────────────────────────────────

interface EyeDropperAPI {
  open(): Promise<{ sRGBHex: string }>
}

declare global {
  interface Window {
    EyeDropper?: new () => EyeDropperAPI
  }
}

// Warm/natural presets matching the Luma aesthetic
const PRESETS = [
  '#5c6b47',
  '#3f4a3c',
  '#8b6914',
  '#c9a227',
  '#7f5539',
  '#9c6644',
  '#b08968',
  '#d5bdaf',
  '#a8a29e',
  '#e7dfd3',
  '#8c3b3b',
  '#262322',
]

const POPOVER_WIDTH = 224
const POPOVER_EST_HEIGHT = 260

// ── Component ─────────────────────────────────────────────────────────────────

interface ColorInputProps {
  value: string
  onChange: (hex: string) => void
  'aria-label'?: string
  className?: string
}

/**
 * Swatch + hex field with a custom popover picker: saturation/brightness area,
 * hue slider, warm-palette presets, and (where supported) the EyeDropper API.
 */
export function ColorInput({
  value,
  onChange,
  'aria-label': ariaLabel = 'בחירת גוון',
  className,
}: ColorInputProps) {
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 80, s: 0.35, v: 0.4 })

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const svRef = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef(normalizeHex(value) ?? value)

  const currentHex = hsvToHex(hsv)

  const emit = useCallback(
    (next: Hsv) => {
      setHsv(next)
      const hex = hsvToHex(next)
      lastEmitted.current = hex
      onChange(hex)
    },
    [onChange]
  )

  // Sync from parent (e.g. draft reset) without fighting our own emits
  useEffect(() => {
    setText(value)
    const normalized = normalizeHex(value)
    if (normalized && normalized !== lastEmitted.current) {
      lastEmitted.current = normalized
      const parsed = hexToHsv(normalized)
      if (parsed) setHsv(parsed)
    }
  }, [value])

  function openPopover() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const openUpward =
      window.innerHeight - rect.bottom < POPOVER_EST_HEIGHT && rect.top > POPOVER_EST_HEIGHT
    setPos({
      top: openUpward ? rect.top - POPOVER_EST_HEIGHT - 6 : rect.bottom + 6,
      left: clamp(rect.left, 8, window.innerWidth - POPOVER_WIDTH - 8),
    })
    setOpen(true)
  }

  // Close on outside click / Escape / scroll (fixed positioning goes stale on scroll)
  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (!popoverRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    function handleScroll(e: Event) {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [open])

  useEffect(() => {
    if (open) svRef.current?.focus()
  }, [open])

  // ── Saturation/value area ────────────────────────────────────────────────

  function updateSvFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    emit({
      ...hsv,
      s: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      v: clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1),
    })
  }

  function handleSvKey(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 0.1 : 0.02
    let handled = true
    if (e.key === 'ArrowLeft') emit({ ...hsv, s: clamp(hsv.s - step, 0, 1) })
    else if (e.key === 'ArrowRight') emit({ ...hsv, s: clamp(hsv.s + step, 0, 1) })
    else if (e.key === 'ArrowUp') emit({ ...hsv, v: clamp(hsv.v + step, 0, 1) })
    else if (e.key === 'ArrowDown') emit({ ...hsv, v: clamp(hsv.v - step, 0, 1) })
    else handled = false
    if (handled) e.preventDefault()
  }

  // ── Hue slider ───────────────────────────────────────────────────────────

  function updateHueFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    emit({ ...hsv, h: clamp(((e.clientX - rect.left) / rect.width) * 360, 0, 359.9) })
  }

  function handleHueKey(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 15 : 4
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      emit({ ...hsv, h: clamp(hsv.h - step, 0, 359.9) })
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      emit({ ...hsv, h: clamp(hsv.h + step, 0, 359.9) })
    }
  }

  async function handleEyeDropper() {
    if (!window.EyeDropper) return
    try {
      const result = await new window.EyeDropper().open()
      const hex = normalizeHex(result.sRGBHex)
      if (hex) {
        const parsed = hexToHsv(hex)
        if (parsed) emit(parsed)
      }
    } catch {
      /* user cancelled */
    }
  }

  function handleText(raw: string) {
    setText(raw)
    const hex = normalizeHex(raw)
    if (hex) {
      lastEmitted.current = hex
      const parsed = hexToHsv(hex)
      if (parsed) setHsv(parsed)
      onChange(hex)
    }
  }

  return (
    <div className={`flex items-center gap-2${className ? ` ${className}` : ''}`}>
      {/* Swatch trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative w-9 h-9 rounded-lg border border-border shrink-0 cursor-pointer overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] transition-shadow hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          open ? 'ring-2 ring-primary' : ''
        }`}
        style={{ backgroundColor: normalizeHex(text) ?? value }}
      />

      {/* Hex field */}
      <div className="relative flex-1 min-w-0" dir="ltr">
        <span
          aria-hidden="true"
          className="absolute start-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted select-none"
        >
          #
        </span>
        <input
          type="text"
          value={text.replace(/^#/, '')}
          onChange={(e) => handleText(e.target.value)}
          onBlur={() => setText(normalizeHex(text) ?? value)}
          maxLength={6}
          spellCheck={false}
          aria-label={`${ariaLabel} (hex)`}
          className="w-full h-9 ps-6 pe-2.5 text-xs font-mono tracking-wide bg-bg border border-border rounded-lg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="a8a29e"
        />
      </div>

      {/* Popover picker */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={popoverRef}
                role="dialog"
                aria-label={ariaLabel}
                dir="ltr"
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
                className="z-50 bg-surface border border-border rounded-xl shadow-xl p-3 space-y-3"
              >
                {/* Saturation / brightness area */}
                <div
                  ref={svRef}
                  role="slider"
                  aria-label="רוויה ובהירות"
                  aria-valuetext={`רוויה ${Math.round(hsv.s * 100)}%, בהירות ${Math.round(hsv.v * 100)}%`}
                  aria-valuenow={Math.round(hsv.v * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  tabIndex={0}
                  onKeyDown={handleSvKey}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    updateSvFromPointer(e)
                  }}
                  onPointerMove={(e) => {
                    if (e.buttons === 1) updateSvFromPointer(e)
                  }}
                  className="relative h-32 rounded-lg cursor-crosshair touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{
                    backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                    backgroundImage:
                      'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ring-1 ring-black/25 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: `${hsv.s * 100}%`,
                      top: `${(1 - hsv.v) * 100}%`,
                      backgroundColor: currentHex,
                    }}
                  />
                </div>

                {/* Hue slider + eyedropper */}
                <div className="flex items-center gap-2">
                  <div
                    role="slider"
                    aria-label="גוון"
                    aria-valuenow={Math.round(hsv.h)}
                    aria-valuemin={0}
                    aria-valuemax={360}
                    tabIndex={0}
                    onKeyDown={handleHueKey}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      updateHueFromPointer(e)
                    }}
                    onPointerMove={(e) => {
                      if (e.buttons === 1) updateHueFromPointer(e)
                    }}
                    className="relative flex-1 h-3.5 rounded-full cursor-pointer touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{
                      background:
                        'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md ring-1 ring-black/25 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: `${(hsv.h / 360) * 100}%`,
                        backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                      }}
                    />
                  </div>
                  {typeof window !== 'undefined' && window.EyeDropper && (
                    <button
                      type="button"
                      onClick={handleEyeDropper}
                      title="דגימת צבע מהמסך"
                      aria-label="דגימת צבע מהמסך"
                      className="flex items-center justify-center w-7 h-7 rounded-lg border border-border text-text-muted hover:bg-secondary hover:text-text-main transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Pipette size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Presets */}
                <div className="grid grid-cols-6 gap-1.5" role="listbox" aria-label="צבעים מוכנים">
                  {PRESETS.map((preset) => {
                    const isSelected = preset === currentHex
                    return (
                      <button
                        key={preset}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        aria-label={preset}
                        title={preset}
                        onClick={() => {
                          const parsed = hexToHsv(preset)
                          if (parsed) emit(parsed)
                        }}
                        className={`w-7 h-7 rounded-full border cursor-pointer transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-black/10'
                        }`}
                        style={{ backgroundColor: preset }}
                      />
                    )
                  })}
                </div>

                {/* Current value readout */}
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <span
                    aria-hidden="true"
                    className="w-5 h-5 rounded border border-border shrink-0"
                    style={{ backgroundColor: currentHex }}
                  />
                  <span className="text-xs font-mono text-text-muted select-all">{currentHex}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
