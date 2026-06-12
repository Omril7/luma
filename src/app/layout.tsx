import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Luma — Custom Furniture',
  description: 'Handmade custom furniture',
}

// Root layout — provides the <html>/<body> shell.
// Lang/dir attributes are set by the [lang] layout via suppressHydrationWarning.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
