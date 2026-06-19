import { type Metadata } from 'next'
import { EmailServicesPage } from '@/features/admin/email-services/EmailServicesPage'

export const metadata: Metadata = { title: 'שירותי דואר — Luma ניהול' }

export default function AdminEmailServicesPage() {
  return <EmailServicesPage />
}
