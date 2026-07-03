import type { Metadata } from 'next'
import { Heebo, Rubik, Inter, Cormorant_Garamond, Frank_Ruhl_Libre } from 'next/font/google'
import '@/styles/globals.css'

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
})

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  variable: '--font-rubik',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const frankRuhl = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-frank-ruhl',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Luma — Custom Furniture',
  description: 'Handmade custom furniture',
}

// Root layout — provides the <html>/<body> shell.
// Lang/dir attributes are set by the [lang] layout via suppressHydrationWarning.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${heebo.variable} ${rubik.variable} ${inter.variable} ${cormorant.variable} ${frankRuhl.variable}`}
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
