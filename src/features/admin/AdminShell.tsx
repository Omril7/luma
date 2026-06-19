'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import {
  LayoutDashboard,
  Package,
  Tag,
  FileText,
  Mail,
  Send,
  ImageIcon,
  Settings,
  LogOut,
  ExternalLink,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { useAdminStore } from '@/stores/adminStore'

const NAV_ITEMS = [
  { href: '/admin', icon: LayoutDashboard, label: 'לוח בקרה', exact: true },
  { href: '/admin/products', icon: Package, label: 'מוצרים', exact: false },
  { href: '/admin/coupons', icon: Tag, label: 'קופונים', exact: false },
  { href: '/admin/content', icon: FileText, label: 'תוכן האתר', exact: false },
  { href: '/admin/email-services', icon: Mail, label: 'שירותי דואר', exact: false },
  { href: '/admin/newsletter', icon: Send, label: 'ניוזלטר', exact: false },
  { href: '/admin/gallery', icon: ImageIcon, label: 'גלריה', exact: false },
  { href: '/admin/settings', icon: Settings, label: 'הגדרות', exact: false },
]

const COLLAPSED_KEY = 'luma-admin-collapsed'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { token, email, clearAuth } = useAdminStore()

  const [hydrated, setHydrated] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setHydrated(true)
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === 'true')
    } catch {
      /* localStorage unavailable */
    }
  }, [])

  // Close mobile drawer on every navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (hydrated && !isLoginPage && !token) {
      router.replace('/admin/login')
    }
  }, [hydrated, isLoginPage, token, router])

  if (isLoginPage) return <>{children}</>

  if (!hydrated || !token) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <div
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="טוען..."
        />
      </div>
    )
  }

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next))
    } catch {
      /* ignore */
    }
  }

  function handleLogout() {
    clearAuth()
    router.replace('/admin/login')
  }

  const currentNav = NAV_ITEMS.find((n) =>
    n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + '/')
  )

  return (
    <div className="min-h-dvh bg-bg" dir="rtl">
      {/* ── Mobile backdrop ────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      {/*
       * start-0   = right:0 in RTL (sidebar anchored to right edge)
       * translate-x-full   = slide off-screen to the right (hidden on mobile)
       * lg:translate-x-0   = always visible on desktop
       * transition combines width (desktop collapse) + transform (mobile open/close)
       */}
      <aside
        id="admin-sidebar"
        aria-label="תפריט ניהול"
        className={[
          'fixed inset-y-0 start-0 z-30 flex flex-col bg-surface border-e border-border',
          'transition-[width,transform] duration-200 ease-in-out will-change-transform',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo + controls row */}
        <div
          className={`h-16 flex items-center shrink-0 border-b border-border ${
            collapsed ? 'justify-center px-2' : 'ps-5 pe-3 gap-2'
          }`}
        >
          {!collapsed && (
            <Link
              href="/admin"
              className="flex-1 flex items-center gap-2 min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="text-lg font-bold text-primary tracking-tight whitespace-nowrap">
                Luma
              </span>
              <span className="text-[11px] font-semibold text-text-muted bg-secondary px-2 py-0.5 rounded-full border border-border whitespace-nowrap shrink-0">
                ניהול
              </span>
            </Link>
          )}

          {/* Desktop: collapse/expand toggle */}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
            title={collapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors shrink-0 cursor-pointer"
          >
            {/* RTL: ChevronLeft = "expand left", ChevronRight = "collapse right" */}
            {collapsed ? (
              <ChevronLeft size={16} aria-hidden="true" />
            ) : (
              <ChevronRight size={16} aria-hidden="true" />
            )}
          </button>

          {/* Mobile: close button (visible only on mobile) */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="סגור תפריט"
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors shrink-0 ms-auto cursor-pointer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="ניווט ראשי">
          <ul className="space-y-0.5" role="list">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={[
                      'flex items-center rounded-lg text-sm font-medium',
                      'transition-colors duration-150 min-h-[44px]',
                      collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                      isActive
                        ? 'bg-secondary text-primary'
                        : 'text-text-muted hover:bg-secondary hover:text-text-main',
                    ].join(' ')}
                  >
                    <Icon size={18} aria-hidden="true" className="shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {isActive && (
                          <motion.span
                            layoutId="nav-dot"
                            className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer: email + utility links */}
        <div className="shrink-0 border-t border-border p-2 space-y-0.5">
          {!collapsed && (
            <p className="px-3 py-1 text-xs text-text-muted truncate" title={email ?? ''}>
              {email}
            </p>
          )}

          <Link
            href="/he"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? 'לאתר' : undefined}
            className={[
              'flex items-center w-full px-3 py-2 rounded-lg text-sm',
              'text-text-muted hover:bg-secondary hover:text-text-main',
              'transition-colors duration-150 min-h-[44px]',
              collapsed ? 'justify-center' : 'gap-3',
            ].join(' ')}
          >
            <ExternalLink size={16} aria-hidden="true" className="shrink-0" />
            {!collapsed && <span>לאתר</span>}
          </Link>

          <a
            href="https://luma-manager.vercel.app/orders"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? 'ניהול הזמנות' : undefined}
            className={[
              'flex items-center w-full px-3 py-2 rounded-lg text-sm',
              'text-text-muted hover:bg-secondary hover:text-text-main',
              'transition-colors duration-150 min-h-[44px]',
              collapsed ? 'justify-center' : 'gap-3',
            ].join(' ')}
          >
            <ShoppingBag size={16} aria-hidden="true" className="shrink-0" />
            {!collapsed && <span>ניהול הזמנות</span>}
          </a>

          <button
            onClick={handleLogout}
            title={collapsed ? 'יציאה' : undefined}
            className={[
              'flex items-center w-full px-3 py-2 rounded-lg text-sm cursor-pointer',
              'text-text-muted hover:bg-red-50 hover:text-red-600',
              'transition-colors duration-150 min-h-[44px]',
              collapsed ? 'justify-center' : 'gap-3',
            ].join(' ')}
          >
            <LogOut size={16} aria-hidden="true" className="shrink-0" />
            {!collapsed && <span>יציאה</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────── */}
      {/*
       * ps-0 on mobile (sidebar overlays, no offset needed)
       * lg:ps-64 or lg:ps-16 on desktop (sidebar is in-flow via fixed + padding offset)
       * transition-[padding] animates the offset on desktop collapse
       */}
      <div
        className={[
          'flex flex-col min-h-dvh',
          'transition-[padding] duration-200 ease-in-out',
          collapsed ? 'lg:ps-16' : 'lg:ps-64',
        ].join(' ')}
      >
        {/* Top header */}
        <header className="sticky top-0 z-20 h-14 bg-surface/95 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3">
          {/* Hamburger: mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="פתח תפריט"
            aria-expanded={mobileOpen}
            aria-controls="admin-sidebar"
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:bg-secondary hover:text-text-main transition-colors shrink-0 cursor-pointer"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <h1 className="text-sm font-semibold text-text-main">
            {currentNav?.label ?? 'לוח בקרה'}
          </h1>
        </header>

        <main id="main-content" className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
