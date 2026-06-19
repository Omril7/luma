import { type Metadata } from 'next'
import { GalleryPage } from '@/features/admin/gallery/GalleryPage'

export const metadata: Metadata = { title: 'גלריה — Luma ניהול' }

export default function AdminGalleryPage() {
  return <GalleryPage />
}
