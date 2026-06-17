'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useUiStore } from '@/stores/uiStore'
import { ProductCard } from '@/features/products/ProductCard'
import type { ProductDTO } from '@/shared/types'

interface FeaturedSectionProps {
  products: ProductDTO[]
  locale: string
}

export function FeaturedSection({ products, locale }: FeaturedSectionProps) {
  const t = useTranslations('home.featured')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.reduceMotion

  return (
    <section className="py-16 md:py-24 bg-bg">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-8 md:mb-12">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-text-main"
            initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {t('heading')}
          </motion.h2>
          <Link
            href="/shop"
            className="text-primary font-semibold hover:text-primary-600 transition-colors duration-150 text-sm md:text-base"
          >
            {t('viewAll')}
          </Link>
        </div>

        {/* Product grid or empty state */}
        {products.length === 0 ? (
          <p className="text-center text-text-muted py-16">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                viewport={{ once: true, margin: '-80px' }}
                transition={{
                  delay: index * 0.08,
                  duration: 0.4,
                  ease: 'easeOut',
                }}
              >
                <ProductCard product={product} locale={locale} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
