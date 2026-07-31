import type { SVGProps } from 'react'

interface FacebookIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
}

export function FacebookIcon({ size = 24, ...props }: FacebookIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7.8h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.49-1.46H16.6V4.14C16.34 4.1 15.46 4 14.44 4c-2.13 0-3.59 1.3-3.59 3.68v2.52H8.25v3h2.6V21h2.65z" />
    </svg>
  )
}
