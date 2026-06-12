import { useTranslations } from 'next-intl'

export default function HomePage() {
  const t = useTranslations('nav')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold text-primary">Luma</h1>
      <p className="text-text-muted">{t('home')}</p>
    </main>
  )
}
