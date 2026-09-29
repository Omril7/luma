'use client'

export function CheckboxRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary shrink-0 cursor-pointer accent-primary"
      />
      <span className="text-sm text-text-main leading-snug">
        {label}
        {description && <span className="block text-xs text-text-muted mt-0.5">{description}</span>}
      </span>
    </label>
  )
}
