'use client'

import { motion } from 'motion/react'
import { useUiStore } from '@/stores/uiStore'

interface LegalSection {
  heading: string
  body: string
}

interface LegalPageContentProps {
  title: string
  updated: string
  intro: string
  // next-intl's message type doesn't allow arrays in translation JSON, so `sections` is stored
  // as an index-keyed object (`{"0": {...}, "1": {...}}`) and converted here via Object.values.
  sections: Record<string, LegalSection>
  /** Shown as a mailto link below the sections — e.g. the accessibility statement's
   *  required contact channel for reporting barriers. Omitted when not configured. */
  contactEmail?: string
  contactLabel?: string
}

export function LegalPageContent({
  title,
  updated,
  intro,
  sections,
  contactEmail,
  contactLabel,
}: LegalPageContentProps) {
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 className="font-heading text-3xl font-semibold text-text-main md:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-text-muted">{updated}</p>
          <p className="mt-6 text-lg leading-relaxed text-text-muted">{intro}</p>
        </motion.div>

        <div className="mt-10 space-y-8">
          {Object.values(sections).map((section, i) => (
            <motion.div
              key={i}
              initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
              whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.03 }}
            >
              <h2 className="text-xl font-semibold text-text-main">{section.heading}</h2>
              <p className="mt-2 leading-relaxed text-text-muted">{section.body}</p>
            </motion.div>
          ))}
        </div>

        {contactEmail && (
          <div className="mt-10 rounded-xl border border-border bg-secondary p-5">
            <p className="text-sm text-text-main">
              {contactLabel}{' '}
              <a href={`mailto:${contactEmail}`} className="font-semibold text-primary underline">
                {contactEmail}
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
