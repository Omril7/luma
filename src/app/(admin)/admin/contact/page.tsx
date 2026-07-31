import { type Metadata } from 'next'
import { ContactMessagesListPage } from '@/features/admin/contact/ContactMessagesListPage'

export const metadata: Metadata = { title: 'הודעות יצירת קשר — Luma ניהול' }

export default function AdminContactPage() {
  return <ContactMessagesListPage />
}
