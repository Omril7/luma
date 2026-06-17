'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { useLanguageSwitch } from '@/hooks/useLanguageSwitch'
import { useCartStore } from '@/stores/cartStore'
import { useUiStore } from '@/stores/uiStore'

const navLinks = [
  { href: '/' as const, key: 'home' },
  { href: '/shop' as const, key: 'shop' },
  { href: '/about' as const, key: 'about' },
  { href: '/gallery' as const, key: 'gallery' },
  { href: '/contact' as const, key: 'contact' },
] as const

export function Header() {
  const t = useTranslations('nav')
  const tHeader = useTranslations('header')
  const { switchTo, isHebrew } = useLanguageSwitch()
  const cartItems = useCartStore((s) => s.items)
  const { a11y } = useUiStore()
  const pathname = usePathname()

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const shouldAnimate = !a11y.noMotion

  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <header
      className={[
        'sticky top-0 z-40 bg-surface/95 backdrop-blur-sm transition-shadow duration-200',
        scrolled ? 'border-b border-border shadow-soft' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 text-2xl font-bold text-primary">
          {isHebrew ? 'לומה' : 'Luma'}
        </Link>

        {/* Desktop nav — centered */}
        <nav className="hidden items-center gap-6 md:flex" aria-label={t('home')}>
          {navLinks.map(({ href, key }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={key}
                href={href}
                className={[
                  'text-sm transition-colors duration-150',
                  isActive
                    ? 'font-semibold text-primary'
                    : 'font-medium text-text-main hover:text-primary',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {t(key)}
              </Link>
            )
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <button
            onClick={() => switchTo(isHebrew ? 'en' : 'he')}
            className="min-h-[44px] min-w-[44px] rounded-full border border-border px-3 py-1 text-sm font-medium text-text-main transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2"
            aria-label={isHebrew ? 'Switch to English' : 'עבור לעברית'}
          >
            {isHebrew ? 'EN' : 'עב'}
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-text-main transition-colors hover:text-primary focus-visible:outline-2"
            aria-label={`${t('cart')}${itemCount > 0 ? ` (${itemCount})` : ''}`}
          >
            <ShoppingBag size={22} />
            {itemCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute end-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-surface"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-text-main transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? tHeader('closeMenu') : tHeader('openMenu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-nav"
            initial={shouldAnimate ? { height: 0, opacity: 0 } : false}
            animate={
              shouldAnimate ? { height: 'auto', opacity: 1 } : { height: 'auto', opacity: 1 }
            }
            exit={shouldAnimate ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-t border-border bg-surface md:hidden"
          >
            <nav className="flex flex-col px-4 py-3" aria-label={tHeader('openMenu')}>
              {navLinks.map(({ href, key }) => {
                const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <Link
                    key={key}
                    href={href}
                    className={[
                      'block py-3 text-base transition-colors duration-150',
                      isActive
                        ? 'font-semibold text-primary'
                        : 'font-medium text-text-main hover:text-primary',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setMenuOpen(false)}
                  >
                    {t(key)}
                  </Link>
                )
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
