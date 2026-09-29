'use client'

import { useState, useEffect, useRef, useId } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Input } from '@/components/ui/Input'

export interface PickedPlace {
  label: string
  coords: [number, number] // [lng, lat]
}

interface PlacePickerProps {
  id: string
  kind: 'city' | 'street'
  label: string
  placeholder: string
  value: PickedPlace | null
  onChange: (value: PickedPlace | null) => void
  /** Chosen city — required for street search; the picker is disabled until it is set */
  city?: PickedPlace | null
  error?: string
  /** Extra classes for the input (page-specific look) */
  inputClassName?: string
}

const DEBOUNCE_MS = 300
const MIN_CHARS = 3

export function PlacePicker({
  id,
  kind,
  label,
  placeholder,
  value,
  onChange,
  city,
  error,
  inputClassName,
}: PlacePickerProps) {
  const t = useTranslations('checkout')
  const pageDir = useLocale() === 'he' ? 'rtl' : 'ltr'
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PickedPlace[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)

  const disabled = kind === 'street' && !city
  const cityLabel = city?.label
  const cityLng = city?.coords[0]
  const cityLat = city?.coords[1]

  // ── Debounced search; the cleanup aborts stale requests so they can't overwrite newer ones
  useEffect(() => {
    const text = query.trim()
    if (value || disabled || text.length < MIN_CHARS) {
      setSuggestions([])
      setSearching(false)
      setSearchError(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError(false)
      try {
        const params = new URLSearchParams({ kind, text })
        if (kind === 'street' && cityLabel && cityLng != null && cityLat != null) {
          params.set('city', cityLabel)
          params.set('cityLng', String(cityLng))
          params.set('cityLat', String(cityLat))
        }
        const res = await fetch(`/api/delivery/autocomplete?${params}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setSuggestions((await res.json()) as PickedPlace[])
        setActiveIndex(-1)
        setOpen(true)
      } catch (err) {
        if (controller.signal.aborted || (err as Error).name === 'AbortError') return
        setSuggestions([])
        setSearchError(true)
        setOpen(true)
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, value, disabled, kind, cityLabel, cityLng, cityLat])

  // ── Close on outside click
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function select(item: PickedPlace) {
    onChange(item)
    setQuery('')
    setSuggestions([])
    setOpen(false)
  }

  function clear() {
    onChange(null)
    // Wait for the input to re-render before focusing it
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open && suggestions.length > 0) setOpen(true)
      setActiveIndex((i) => (suggestions.length ? (i + 1) % suggestions.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (suggestions.length ? (i <= 0 ? suggestions.length - 1 : i - 1) : -1))
    } else if (e.key === 'Enter') {
      // Never submit the checkout form from here
      e.preventDefault()
      if (open && activeIndex >= 0 && suggestions[activeIndex]) select(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList =
    open &&
    !value &&
    !disabled &&
    (suggestions.length > 0 || searchError || (!searching && query.trim().length >= MIN_CHARS))
  const activeId = activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>

      {value ? (
        // Confirmation of the chosen place
        <div
          className="flex min-h-[44px] items-center gap-2 rounded-[var(--radius)] border border-[var(--color-primary)] bg-[var(--color-secondary)] px-3 py-2"
          role="status"
        >
          <MapPin size={16} aria-hidden="true" className="shrink-0 text-[var(--color-primary)]" />
          <span id={id} dir="auto" className="min-w-0 flex-1 text-sm text-[var(--color-text)]">
            {value.label}
          </span>
          <button
            type="button"
            onClick={clear}
            aria-label={t('changeField', { field: label })}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            variant="storefront"
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            // Placeholder follows the page language; typed text picks its own direction
            dir={query ? 'auto' : pageDir}
            autoComplete="off"
            disabled={disabled}
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-describedby={error ? `error-${id}` : undefined}
            aria-invalid={!!error}
            placeholder={disabled ? t('chooseCityFirst') : placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onKeyDown={handleKeyDown}
            className={`${inputClassName ?? ''} pe-9 disabled:cursor-not-allowed disabled:opacity-60`}
          />
          {searching && (
            <Loader2
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]"
            />
          )}

          {showList && (
            // Inline (not floating): the animated wrapper around the address fields clips overflow
            <ul
              id={listId}
              role="listbox"
              aria-label={label}
              className="mt-1 max-h-64 overflow-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1"
            >
              {suggestions.map((s, i) => (
                <li
                  key={`${s.label}-${i}`}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  dir="auto"
                  // mousedown (not click) so selection happens before any blur/outside handling
                  onMouseDown={(e) => {
                    e.preventDefault()
                    select(s)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex min-h-[44px] cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] ${
                    i === activeIndex ? 'bg-[var(--color-secondary)]' : ''
                  }`}
                >
                  <MapPin
                    size={14}
                    aria-hidden="true"
                    className="shrink-0 text-[var(--color-text-muted)]"
                  />
                  <span>{s.label}</span>
                </li>
              ))}
              {suggestions.length === 0 && (
                <li
                  role="presentation"
                  className="px-3 py-2 text-sm text-[var(--color-text-muted)]"
                >
                  {searchError ? t('addressSearchError') : t('addressNoResults')}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p id={`error-${id}`} role="alert" className="mt-1 text-xs text-[var(--color-accent)]">
          {error}
        </p>
      )}
    </div>
  )
}
