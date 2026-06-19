import { type Metadata } from 'next'
import { SettingsPage } from '@/features/admin/settings/SettingsPage'

export const metadata: Metadata = { title: 'הגדרות — Luma ניהול' }

export default function AdminSettingsPage() {
  return <SettingsPage />
}
