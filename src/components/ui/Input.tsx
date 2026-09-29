import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'admin' | 'storefront'

interface SharedProps {
  /** Red border / ring. Pair with an error message and aria-describedby. */
  hasError?: boolean
  /** Compact h-9 text-xs field (admin list rows). Default is h-10 text-sm. Ignored by storefront. */
  compact?: boolean
  /** 'admin' = bg-bg field; 'storefront' = bg-surface, 44px touch target. */
  variant?: Variant
}

export function fieldClass({
  hasError = false,
  compact = false,
  variant = 'admin',
  textarea = false,
}: SharedProps & { textarea?: boolean }): string {
  if (variant === 'storefront') {
    return [
      'w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-text-main',
      'placeholder:text-text-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
      'min-h-[44px]',
      hasError ? 'border-red-400 focus:ring-red-400' : 'border-border focus:border-primary',
    ].join(' ')
  }
  return [
    'w-full bg-bg border rounded-lg text-text-main',
    'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary',
    textarea ? 'px-3 py-2 text-sm' : compact ? 'h-9 px-2.5 text-xs' : 'h-10 px-3 text-sm',
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-border focus:border-primary',
  ].join(' ')
}

/**
 * Storefront fields are merged with tailwind-merge so a caller can override any default
 * (bg, radius, padding, text size, colours). Admin fields just append, as before.
 */
function withExtra(base: string, extra: string | undefined, variant: Variant | undefined): string {
  if (!extra) return base
  return variant === 'storefront' ? cn(base, extra) : `${base} ${extra}`
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & SharedProps

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError, compact, variant, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={hasError || undefined}
      className={withExtra(fieldClass({ hasError, compact, variant }), className, variant)}
      {...rest}
    />
  )
})

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & SharedProps

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { hasError, compact, variant, className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={hasError || undefined}
      className={withExtra(
        fieldClass({ hasError, compact, variant, textarea: true }),
        className,
        variant
      )}
      {...rest}
    />
  )
})
