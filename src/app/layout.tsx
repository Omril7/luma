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

// Applies the custom dark palette before first paint when the OS prefers dark and the
// user hasn't explicitly picked a visual mode yet — avoids a light-then-dark flash and
// keeps this in sync with the fallback logic in components/A11yWidget.tsx.
const THEME_INIT_SCRIPT = `
try {
  var stored = JSON.parse(localStorage.getItem('luma-ui') || 'null');
  var a11y = stored && stored.state && stored.state.a11y;
  var dark = a11y && a11y.systemThemeDismissed
    ? !!a11y.dark
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.setAttribute('data-dark', 'true');
} catch (e) {}
`

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
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  )
}
