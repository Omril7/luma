import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json(
    {
      name: 'Luma — ניהול',
      short_name: 'Luma Admin',
      description: 'ממשק ניהול לחנות Luma',
      start_url: '/admin',
      scope: '/admin',
      display: 'standalone',
      dir: 'rtl',
      lang: 'he',
      background_color: '#faf5ea',
      theme_color: '#5c6b47',
      icons: [
        { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        {
          src: '/pwa/icon-512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  )
}
