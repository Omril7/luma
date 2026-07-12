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
  // True once the user has explicitly picked a visual mode (dark/contrast/grayscale/sepia)
  // via the widget. Until then, `dark` auto-follows the OS `prefers-color-scheme`.
  systemThemeDismissed: boolean
}

interface UiState {
  toasts: Toast[]
  a11y: A11yPrefs
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setA11y: (prefs: Partial<A11yPrefs>) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      toasts: [],
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
        systemThemeDismissed: false,
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
    }),
    {
      name: 'luma-ui',
      partialize: (state) => ({ a11y: state.a11y }),
    }
  )
)
