'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useUiStore } from '@/stores/uiStore'

interface AboutPageContent {
  title_he: string
  title_en: string
  body_he: string
  body_en: string
  imageUrl: string
}

interface AboutContentProps {
  locale: string
  content: AboutPageContent
}

export function AboutContent({ locale, content }: AboutContentProps) {
  const t = useTranslations('about')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const title = (locale === 'he' ? content.title_he : content.title_en) || t('title')
  const bodyText = (locale === 'he' ? content.body_he : content.body_en) || ''
  const paragraphs = bodyText.split(/\n+/).filter(Boolean)

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        <motion.h1
          className="mb-10 text-center font-heading text-3xl font-semibold text-text-main md:mb-14 md:text-4xl lg:text-5xl"
          initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {title}
        </motion.h1>

        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
          <motion.div
            className="order-1"
            initial={shouldAnimate ? { opacity: 0, x: -30 } : false}
            whileInView={shouldAnimate ? { opacity: 1, x: 0 } : undefined}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-bg">
              {content.imageUrl ? (
                <Image
                  src={content.imageUrl}
                  alt={t('imageAlt')}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg
                    aria-hidden="true"
                    className="h-20 w-20 text-border"
                    viewBox="0 0 80 80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M20 60 L20 28 Q20 20 28 20 L52 20 Q60 20 60 28 L60 60" />
                    <path d="M14 60 L66 60" strokeLinecap="round" />
                    <path d="M30 20 L30 60" strokeDasharray="3 3" />
                    <path d="M50 20 L50 60" strokeDasharray="3 3" />
                    <circle cx="40" cy="28" r="3" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            className="order-2"
            initial={shouldAnimate ? { opacity: 0, x: 30 } : false}
            whileInView={shouldAnimate ? { opacity: 1, x: 0 } : undefined}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          >
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => (
                <p key={i} className="mb-4 text-lg leading-relaxed text-text-muted last:mb-0">
                  {p}
                </p>
              ))
            ) : (
              <p className="text-lg leading-relaxed text-text-muted">{bodyText}</p>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
