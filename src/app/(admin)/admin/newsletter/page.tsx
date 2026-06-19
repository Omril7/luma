import { type Metadata } from 'next'
import { NewsletterPage } from '@/features/admin/newsletter/NewsletterPage'

export const metadata: Metadata = { title: 'ניוזלטר — Luma ניהול' }

export default function AdminNewsletterPage() {
  return <NewsletterPage />
}
