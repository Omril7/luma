'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

export interface A11yPrefs {
  fontPercent: number // 100–150, step 1
  contrast: boolean
  dark: boolean
  grayscale: boolean
  sepia: boolean
  links: boolean
  readable: boolean
  cursor: boolean
  noMotion: boolean
  lineSpacing: boolean
  letterSpacing: boolean
  hideImages: boolean
  underlineHeadings: boolean
  pauseMedia: boolean
  bold: boolean
  focus: boolean
  readingGuide: boolean
}

interface UiState {
  toasts: Toast[]
  a11y: A11yPrefs
  // Not persisted — lets fixed-position floating widgets (a11y trigger, socials
  // speed-dial) hide themselves while the mobile nav dropdown is open, since it
  // can grow tall enough to sit underneath them.
  mobileMenuOpen: boolean
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setA11y: (prefs: Partial<A11yPrefs>) => void
  setMobileMenuOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      toasts: [],
      mobileMenuOpen: false,
      a11y: {
        fontPercent: 100,
        contrast: false,
        dark: false,
        grayscale: false,
        sepia: false,
        links: false,
        readable: false,
        cursor: false,
        noMotion: false,
        lineSpacing: false,
        letterSpacing: false,
        hideImages: false,
        underlineHeadings: false,
        pauseMedia: false,
        bold: false,
        focus: false,
        readingGuide: false,
      },

      addToast: (toast) => {
        const id = crypto.randomUUID()
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
        setTimeout(
          () => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
          5000
        )
      },

      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      setA11y: (prefs) => set((state) => ({ a11y: { ...state.a11y, ...prefs } })),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    }),
    {
      name: 'luma-ui',
      partialize: (state) => ({ a11y: state.a11y }),
    }
  )
)
