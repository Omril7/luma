'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'

interface FaqItem {
  q_he: string
  q_en: string
  a_he: string
  a_en: string
}

interface FaqClientProps {
  locale: string
  items: FaqItem[]
}

export function FaqClient({ locale, items }: FaqClientProps) {
  const t = useTranslations('faq')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const [openIndex, setOpenIndex] = useState<number | null>(0)

  function toggle(index: number) {
    setOpenIndex((current) => (current === index ? null : index))
  }

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <motion.div
          className="mb-10 text-center md:mb-14"
          initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 className="font-heading text-3xl font-semibold text-text-main md:text-4xl lg:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-text-muted">{t('subtitle')}</p>
        </motion.div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
              <HelpCircle
                size={32}
                strokeWidth={1.25}
                aria-hidden="true"
                className="text-text-muted"
              />
            </div>
            <p className="text-text-muted">{t('empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {items.map((item, index) => {
              const question = locale === 'he' ? item.q_he : item.q_en
              const answer = locale === 'he' ? item.a_he : item.a_en
              const isOpen = openIndex === index
              const buttonId = `faq-question-${index}`
              const panelId = `faq-answer-${index}`

              return (
                <div key={index}>
                  <h2>
                    <button
                      id={buttonId}
                      type="button"
                      onClick={() => toggle(index)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="flex w-full min-h-[56px] cursor-pointer items-center justify-between gap-4 px-5 py-4 text-start font-medium text-text-main transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:px-6"
                    >
                      <span>{question}</span>
                      <ChevronDown
                        size={20}
                        aria-hidden="true"
                        className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </h2>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={shouldAnimate ? { height: 0, opacity: 0 } : false}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={shouldAnimate ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 leading-relaxed text-text-muted md:px-6">
                          {answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
