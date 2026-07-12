import { type Metadata } from 'next'
import { InstagramPage } from '@/features/admin/instagram/InstagramPage'

export const metadata: Metadata = { title: 'אינסטגרם — Luma ניהול' }

export default function AdminInstagramPage() {
  return <InstagramPage />
}
