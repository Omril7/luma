'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { MessageCircle, Phone, Mail, X } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { InstagramIcon } from '@/components/icons/InstagramIcon'
import { FacebookIcon } from '@/components/icons/FacebookIcon'

const DEFAULT_WHATSAPP_NUMBER = '972500000000'

interface SocialsSpeedDialProps {
  whatsappNumber?: string
  phone?: string
  email?: string
  instagramUrl?: string
  facebookUrl?: string
}

interface SatelliteLink {
  key: string
  href: string
  label: string
  icon: ReactNode
  bgClass: string
}

export function SocialsSpeedDial({
  whatsappNumber,
  phone,
  email,
  instagramUrl,
  facebookUrl,
}: SocialsSpeedDialProps) {
  const t = useTranslations('socials')
  const { a11y, mobileMenuOpen } = useUiStore()
  const shouldAnimate = !a11y.noMotion
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // The mobile nav dropdown can grow tall enough to sit under this fixed widget —
  // collapse the open satellite menu too, not just hide the trigger, so it doesn't
  // reopen underneath the dropdown.
  useEffect(() => {
    if (mobileMenuOpen) setOpen(false)
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const links: (SatelliteLink | null)[] = [
    facebookUrl
      ? {
          key: 'facebook',
          href: facebookUrl,
          label: t('facebook'),
          icon: <FacebookIcon size={20} aria-hidden="true" />,
          bgClass: 'bg-[#1877F2]',
        }
      : null,
    instagramUrl
      ? {
          key: 'instagram',
          href: instagramUrl,
          label: t('instagram'),
          icon: <InstagramIcon size={20} aria-hidden="true" />,
          bgClass: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]',
        }
      : null,
    {
      key: 'whatsapp',
      href: `https://wa.me/${whatsappNumber || DEFAULT_WHATSAPP_NUMBER}`,
      label: t('whatsapp'),
      icon: <WhatsAppIcon size={20} aria-hidden="true" />,
      bgClass: 'bg-[#25D366]',
    },
    phone
      ? {
          key: 'phone',
          href: `tel:${phone}`,
          label: t('phone'),
          icon: <Phone size={18} aria-hidden="true" />,
          bgClass: 'bg-primary',
        }
      : null,
    email
      ? {
          key: 'email',
          href: `mailto:${email}`,
          label: t('email'),
          icon: <Mail size={18} aria-hidden="true" />,
          bgClass: 'bg-primary',
        }
      : null,
  ]
  const visibleLinks = links.filter((l): l is SatelliteLink => l !== null)

  if (mobileMenuOpen) return null

  return (
    <div ref={containerRef} className="fixed bottom-6 end-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div className="flex flex-col items-end gap-3">
            {visibleLinks.map((link, i) => (
              <motion.a
                key={link.key}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                aria-label={link.label}
                title={link.label}
                initial={shouldAnimate ? { opacity: 0, scale: 0.5, y: 10 } : { opacity: 1 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={shouldAnimate ? { opacity: 0, scale: 0.5, y: 10 } : { opacity: 0 }}
                transition={
                  shouldAnimate
                    ? { delay: i * 0.05, type: 'spring', stiffness: 400, damping: 25 }
                    : { duration: 0 }
                }
                whileHover={shouldAnimate ? { scale: 1.1 } : undefined}
                whileTap={shouldAnimate ? { scale: 0.95 } : undefined}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ${link.bgClass}`}
              >
                {link.icon}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('close') : t('open')}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-surface shadow-lg cursor-pointer"
        whileHover={shouldAnimate ? { scale: 1.1 } : undefined}
        whileTap={shouldAnimate ? { scale: 0.95 } : undefined}
        initial={shouldAnimate ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          shouldAnimate
            ? { delay: 1, type: 'spring', stiffness: 300, damping: 20 }
            : { duration: 0 }
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'open'}
            initial={shouldAnimate ? { opacity: 0, rotate: -45 } : false}
            animate={{ opacity: 1, rotate: 0 }}
            exit={shouldAnimate ? { opacity: 0, rotate: 45 } : undefined}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {open ? (
              <X size={26} aria-hidden="true" />
            ) : (
              <MessageCircle size={26} aria-hidden="true" />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
