'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  'aria-label'?: string
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)

  function toggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setOpenUpward(window.innerHeight - rect.bottom < 220)
    }
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const idx = options.findIndex((o) => o.value === value)
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        toggle()
        return
      }
      if (idx < options.length - 1) onChange(options[idx + 1].value)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (idx > 0) onChange(options[idx - 1].value)
    }
  }

  const popupY = openUpward ? 4 : -4
  const popupOrigin = openUpward ? 'bottom' : 'top'
  const popupPosition = openUpward ? 'bottom-full mb-1' : 'top-full mt-1'

  return (
    <div ref={wrapperRef} className={`relative${className ? ` ${className}` : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="w-full h-10 ps-3 pe-8 text-sm bg-bg border border-border rounded text-text-main whitespace-nowrap flex items-center focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer transition-colors hover:border-primary/50 relative"
      >
        <span className={selected ? 'text-text-main' : 'text-text-muted'}>
          {selected?.label ?? '—'}
        </span>
        <ChevronDown
          size={14}
          className={`absolute end-2.5 top-1/2 -translate-y-1/2 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, scaleY: 0.95, y: popupY }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={{ opacity: 0, scaleY: 0.95, y: popupY }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ transformOrigin: popupOrigin }}
            className={`absolute ${popupPosition} start-0 w-max min-w-full z-50 bg-surface border border-border rounded shadow-soft overflow-hidden py-1`}
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={`px-3 py-2 text-sm whitespace-nowrap flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-secondary text-text-main font-medium'
                      : 'text-text-main hover:bg-bg'
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <Check size={13} className="text-primary shrink-0" aria-hidden="true" />
                  )}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
