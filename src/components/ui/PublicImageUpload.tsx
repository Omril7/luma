'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface PublicImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  className?: string
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB — keep in sync with /api/reviews/upload

/**
 * Compact, unauthenticated image picker for public forms (product review + global
 * review). Posts to the rate-limited /api/reviews/upload endpoint and hands the
 * returned Cloudinary URL back through `onChange`.
 */
export function PublicImageUpload({ value, onChange, className }: PublicImageUploadProps) {
  const t = useTranslations('reviews')
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE) {
      setError(t('formImageError'))
      return
    }
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/reviews/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('upload failed')
      const { url } = (await res.json()) as { url: string }
      onChange(url)
    } catch {
      setError(t('formImageError'))
    } finally {
      setUploading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className={className}>
      <span className="mb-1.5 block text-sm font-medium text-text-main">{t('formImageLabel')}</span>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleInputChange}
        aria-label={t('formImageLabel')}
      />

      {value ? (
        <div className="relative h-40 w-40 overflow-hidden rounded-lg border border-border bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={uploading}
            aria-label={t('formImageRemove')}
            className="absolute end-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-full max-w-xs flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-surface text-text-muted transition-colors hover:border-primary/50 hover:bg-secondary/30 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {uploading ? (
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
              role="status"
              aria-label={t('formSubmitting')}
            />
          ) : (
            <ImagePlus size={22} aria-hidden="true" />
          )}
          <span className="text-xs">{t('formImageHint')}</span>
        </button>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
