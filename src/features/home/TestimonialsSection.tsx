'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useUiStore } from '@/stores/uiStore'

interface TestimonialItem {
  quote: string
  author: string
  location: string
}

const TESTIMONIALS_HE: TestimonialItem[] = [
  {
    quote: 'שולחן האוכל שקיבלנו הוא פשוט מדהים. האיכות מעולה והשירות היה מעל ומעבר.',
    author: 'מיכל כהן',
    location: 'תל אביב',
  },
  {
    quote: 'הזמנו שידת לילה מותאמת אישית ועמדנו בכל הדרישות שלנו. ממליצה בחום!',
    author: 'רותם לוי',
    location: 'ירושלים',
  },
  {
    quote: 'ריהוט איכותי שנראה בדיוק כמו בתמונה. המשלוח היה מהיר והמוצר מושלם.',
    author: 'יוסי אברהם',
    location: 'חיפה',
  },
]

const TESTIMONIALS_EN: TestimonialItem[] = [
  {
    quote:
      'The dining table we received is simply stunning. The quality is excellent and the service was above and beyond.',
    author: 'Michal Cohen',
    location: 'Tel Aviv',
  },
  {
    quote: 'We ordered a custom nightstand and it met every requirement. Highly recommended!',
    author: 'Rotem Levi',
    location: 'Jerusalem',
  },
  {
    quote:
      'Quality furniture that looks exactly like the picture. Delivery was fast and the product is perfect.',
    author: 'Yossi Abraham',
    location: 'Haifa',
  },
]

interface TestimonialsSectionProps {
  locale: string
}

export function TestimonialsSection({ locale }: TestimonialsSectionProps) {
  const t = useTranslations('home.testimonials')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const items = locale === 'he' ? TESTIMONIALS_HE : TESTIMONIALS_EN

  return (
    <section className="py-16 md:py-24 bg-bg">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Heading */}
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-text-main text-center mb-10 md:mb-14"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {t('heading')}
        </motion.h2>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
              whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                delay: index * 0.08,
                duration: 0.4,
                ease: 'easeOut',
              }}
              className="bg-surface rounded-lg border border-border p-6 shadow-soft"
            >
              {/* Stars */}
              <div className="mb-3">
                <span aria-hidden="true" className="text-yellow-500 text-sm tracking-wide">
                  ★★★★★
                </span>
                <span className="sr-only">5 stars</span>
              </div>

              {/* Quote */}
              <blockquote className="text-text-main italic text-sm leading-relaxed mb-4">
                {item.quote}
              </blockquote>

              {/* Author */}
              <footer>
                <p className="font-semibold text-text-main text-sm">{item.author}</p>
                <p className="text-text-muted text-xs">{item.location}</p>
              </footer>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
