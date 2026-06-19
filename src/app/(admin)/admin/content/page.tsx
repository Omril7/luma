import { type Metadata } from 'next'
import { SiteContentPage } from '@/features/admin/site-content/SiteContentPage'

export const metadata: Metadata = { title: 'תוכן האתר — Luma ניהול' }

export default function AdminContentPage() {
  return <SiteContentPage />
}
