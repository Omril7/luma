import type { ReactNode } from 'react'
import { fieldClass } from '@/components/ui/Input'

/** Class string for fields that can't use <Input> / <Textarea> directly. */
export function inputCls(hasError: boolean, textarea = false) {
  return fieldClass({ hasError, textarea })
}

/** Label + control + helper / error text. */
export function FieldRow({
  label,
  error,
  required,
  helper,
  labelDir,
  children,
}: {
  label: ReactNode
  error?: string
  required?: boolean
  helper?: string
  labelDir?: 'ltr' | 'rtl'
  children: ReactNode
}) {
  return (
    <div>
      <label dir={labelDir} className="block text-xs font-medium text-text-main mb-1.5">
        {label}
        {required && (
          <span className="text-red-500 ms-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {helper && !error && <p className="text-xs text-text-muted mt-1">{helper}</p>}
      {error && (
        <p className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
