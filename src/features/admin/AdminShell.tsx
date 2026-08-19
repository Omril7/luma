'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { LogOut, ExternalLink, ChevronLeft, ChevronRight, ChevronDown, Menu, X } from 'lucide-react'
import { isTokenExpired, useAdminStore } from '@/stores/adminStore'
import { ADMIN_NAV_ITEMS, ADMIN_NAV_CATEGORIES } from './adminNav'
import { AdminUnreadBadge } from './shared/AdminUnreadBadge'
import { UNREAD_BADGE_CONFIG } from './shared/unreadBadgeConfig'

const SIDEBAR_ITEMS = ADMIN_NAV_ITEMS.filter((item) => !item.external)
const DASHBOARD_ITEM = SIDEBAR_ITEMS.find((item) => item.exact)!
const NAV_GROUPS = ADMIN_NAV_CATEGORIES.map((category) => ({
  category,
  items: SIDEBAR_ITEMS.filter((item) => item.category === category.id),
})).filter((group) => group.items.length > 0)
const ORDERS_LINK = ADMIN_NAV_ITEMS.find((item) => item.external)!

const COLLAPSED_KEY = 'luma-admin-collapsed'
const NAV_OPEN_KEY = 'luma-admin-nav-open'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { token, email, clearAuth } = useAdminStore()

  const [hydrated, setHydrated] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // All groups open by default until the admin collapses one explicitly.
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setHydrated(true)
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === 'true')
      const savedOpen = localStorage.getItem(NAV_OPEN_KEY)
      if (savedOpen) setOpenCategories(JSON.parse(savedOpen))
    } catch {
      /* localStorage unavailable */
    }
  }, [])

  function isCategoryOpen(categoryId: string): boolean {
    return openCategories[categoryId] !== false
  }

  function toggleCategory(categoryId: string) {
    setOpenCategories((prev) => {
      const next = { ...prev, [categoryId]: !isCategoryOpen(categoryId) }
      try {
        localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  // Auto-expand whichever group contains the current page, so navigating
  // there (e.g. via a link elsewhere) never lands inside a collapsed group.
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((g) =>
      g.items.some((item) =>
        item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/')
      )
    )
    if (activeGroup && openCategories[activeGroup.category.id] === false) {
      setOpenCategories((prev) => ({ ...prev, [activeGroup.category.id]: true }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Close mobile drawer on every navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isLoginPage = pathname === '/admin/login'
  const authed = !!token && !isTokenExpired(token)

  // Drop expired tokens on load and on every navigation, so the shell never
  // renders with a token the API will reject with 401.
  useEffect(() => {
    if (hydrated && token && isTokenExpired(token)) {
      clearAuth()
    }
  }, [hydrated, pathname, token, clearAuth])

  useEffect(() => {
    if (hydrated && !isLoginPage && !authed) {
      router.replace('/admin/login')
    }
  }, [hydrated, isLoginPage, authed, router])

  if (isLoginPage) return <>{children}</>

  if (!hydrated || !authed) {
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

  const currentNav = SIDEBAR_ITEMS.find((n) =>
    n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + '/')
  )

  function renderNavItem(item: (typeof SIDEBAR_ITEMS)[number]) {
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/')
    const Icon = item.icon
    const badgeConfig = UNREAD_BADGE_CONFIG[item.href]
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
          <span className="relative flex items-center justify-center shrink-0">
            <Icon size={18} aria-hidden={true} className="shrink-0" />
            {badgeConfig && collapsed && (
              <AdminUnreadBadge
                endpoint={badgeConfig.endpoint}
                label={badgeConfig.label}
                variant="dot"
              />
            )}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {badgeConfig && (
                <AdminUnreadBadge endpoint={badgeConfig.endpoint} label={badgeConfig.label} />
              )}
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
  }

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
          {collapsed ? (
            // Icon rail: no grouping, just the flat list (category headers add
            // nothing when there are no labels to group).
            <ul className="space-y-0.5" role="list">
              {SIDEBAR_ITEMS.map((item) => renderNavItem(item))}
            </ul>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-0.5" role="list">
                {renderNavItem(DASHBOARD_ITEM)}
              </ul>

              {NAV_GROUPS.map(({ category, items }) => {
                const open = isCategoryOpen(category.id)
                const panelId = `nav-group-${category.id}`
                return (
                  <div key={category.id}>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      aria-expanded={open}
                      aria-controls={panelId}
                      className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wide text-text-muted hover:text-text-main transition-colors cursor-pointer"
                    >
                      <span>{category.label}</span>
                      <ChevronDown
                        size={13}
                        aria-hidden="true"
                        className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.ul
                          id={panelId}
                          role="list"
                          className="space-y-0.5 overflow-hidden"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                        >
                          {items.map((item) => renderNavItem(item))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
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

          {ORDERS_LINK.comingSoon ? (
            <div
              aria-disabled="true"
              title={collapsed ? `${ORDERS_LINK.label} — בקרוב` : 'בקרוב'}
              className={[
                'flex items-center w-full px-3 py-2 rounded-lg text-sm',
                'text-text-muted/60 cursor-not-allowed select-none',
                'min-h-[44px]',
                collapsed ? 'justify-center' : 'gap-3',
              ].join(' ')}
            >
              <ORDERS_LINK.icon size={16} aria-hidden={true} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{ORDERS_LINK.label}</span>
                  <span className="text-[10px] font-semibold text-text-muted bg-secondary px-2 py-0.5 rounded-full border border-border shrink-0">
                    בקרוב
                  </span>
                </>
              )}
            </div>
          ) : (
            <a
              href={ORDERS_LINK.href}
              target="_blank"
              rel="noopener noreferrer"
              title={collapsed ? ORDERS_LINK.label : undefined}
              className={[
                'flex items-center w-full px-3 py-2 rounded-lg text-sm',
                'text-text-muted hover:bg-secondary hover:text-text-main',
                'transition-colors duration-150 min-h-[44px]',
                collapsed ? 'justify-center' : 'gap-3',
              ].join(' ')}
            >
              <ORDERS_LINK.icon size={16} aria-hidden={true} className="shrink-0" />
              {!collapsed && <span>{ORDERS_LINK.label}</span>}
            </a>
          )}

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
