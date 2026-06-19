'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'

export interface ImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  token: string
  className?: string
  label?: string
}

export function ImageUpload({ value, onChange, token, className, label }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'שגיאה בהעלאה')
      }
      const { url } = (await res.json()) as { url: string }
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאה')
    } finally {
      setUploading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so the same file can be re-selected after removal
    e.target.value = ''
  }

  function triggerInput() {
    if (!uploading) inputRef.current?.click()
  }

  return (
    <div className={className}>
      {label && <p className="block text-xs font-medium text-text-muted mb-1">{label}</p>}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleInputChange}
        aria-label={label ?? 'העלאת תמונה'}
      />

      {value ? (
        /* ── Image preview ── */
        <div className="relative h-48 rounded-lg overflow-hidden border border-border bg-surface">
          {uploading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 rounded-lg">
              <span
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"
                role="status"
                aria-label="מעלה..."
              />
              <span className="mt-2 text-xs text-white">מעלה...</span>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label ?? 'תמונה שנבחרה'} className="w-full h-full object-cover" />

          {/* Remove button — top-end corner */}
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={uploading}
            aria-label="הסר תמונה"
            className="absolute top-2 end-2 z-20 flex items-center justify-center w-8 h-8 min-w-[44px] min-h-[44px] -me-1.5 -mt-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      ) : (
        /* ── Empty drop zone ── */
        <button
          type="button"
          onClick={triggerInput}
          disabled={uploading}
          aria-label={label ? `העלאת תמונה — ${label}` : 'העלאת תמונה'}
          className="w-full flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-border rounded-lg bg-surface hover:border-primary/50 hover:bg-secondary/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {uploading ? (
            <>
              <span
                className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
                role="status"
                aria-label="מעלה..."
              />
              <span className="text-sm text-text-muted">מעלה...</span>
            </>
          ) : (
            <>
              <ImagePlus size={24} className="text-text-muted" aria-hidden="true" />
              <span className="text-sm text-text-muted">לחץ להעלאת תמונה</span>
            </>
          )}
        </button>
      )}

      {/* Replace button (shown below image when a value exists) */}
      {value && !uploading && (
        <button
          type="button"
          onClick={triggerInput}
          className="mt-1.5 text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
        >
          החלף תמונה
        </button>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
