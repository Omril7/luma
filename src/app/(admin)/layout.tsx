import type { Metadata, Viewport } from 'next'
import { AdminShell } from '@/features/admin/AdminShell'

export const metadata: Metadata = {
  title: 'Luma — ניהול',
  robots: { index: false, follow: false },
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Luma Admin',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#5c6b47',
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
